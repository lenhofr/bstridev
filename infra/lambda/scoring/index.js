'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function json(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
      ...extraHeaders
    },
    body: body == null ? '' : JSON.stringify(body)
  };
}

function method(event) {
  return event?.requestContext?.http?.method || event?.httpMethod;
}

function path(event) {
  return event?.rawPath || event?.path || '/';
}

function getEventIdFromPath(p) {
  // /events/{eventId}/scoring/(draft|published)
  const m = /^\/events\/([^/]+)\/scoring\/(draft|published)$/.exec(p);
  return m ? { eventId: decodeURIComponent(m[1]), kind: m[2] } : null;
}

function isPublishPath(p) {
  // /events/{eventId}/publish
  const m = /^\/events\/([^/]+)\/publish$/.exec(p);
  return m ? decodeURIComponent(m[1]) : null;
}

function isListDocsPath(p) {
  return p === '/scoring/docs';
}

function isActiveTriathlonPath(p) {
  return p === '/scoring/active';
}

async function getDoc(tableName, eventId, kind) {
  const res = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { eventId, kind }
    })
  );
  return res.Item || null;
}

async function putDoc(tableName, eventId, kind, doc, admin) {
  const now = new Date().toISOString();
  const next = {
    eventId,
    kind,
    updatedAt: now,
    updatedBy: admin || null,
    doc
  };

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: next
    })
  );

  return next;
}

function getAdminIdentity(event) {
  // For HTTP API JWT authorizer, Cognito claims appear here.
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims) return null;
  const userId = claims.sub || claims.username || claims['cognito:username'];
  const displayName = claims.name || claims.email || null;
  if (!userId) return null;
  return { userId, displayName };
}

exports.handler = async (event) => {
  const tableName = process.env.SCORING_TABLE_NAME;
  if (!tableName) return json(500, { error: 'Missing SCORING_TABLE_NAME' });

  const m = method(event);
  const p = path(event);

  if (m === 'OPTIONS') return json(204, null);

  const scoring = getEventIdFromPath(p);
  const publishEventId = isPublishPath(p);
  const listDocs = isListDocsPath(p);
  const activeTriathlon = isActiveTriathlonPath(p);

  try {
    if (activeTriathlon && m === 'GET') {
      const item = await getDoc(tableName, '__config', 'active');
      const activeEventId = item?.doc?.activeEventId;
      return json(200, { activeEventId: typeof activeEventId === 'string' && activeEventId ? activeEventId : null });
    }

    if (activeTriathlon && m === 'PUT') {
      const admin = getAdminIdentity(event);
      if (!admin) return json(401, { error: 'Unauthorized' });

      const body = event.body ? JSON.parse(event.body) : null;
      const activeEventId = body?.activeEventId;
      if (activeEventId != null && (typeof activeEventId !== 'string' || !activeEventId.trim()))
        return json(400, { error: 'activeEventId must be a non-empty string or null' });

      await putDoc(tableName, '__config', 'active', { activeEventId: activeEventId == null ? null : activeEventId.trim() }, admin);
      return json(200, { ok: true });
    }

    if (listDocs && m === 'GET') {
      const admin = getAdminIdentity(event);
      if (!admin) return json(401, { error: 'Unauthorized' });

      const year = event?.queryStringParameters?.year ? Number(event.queryStringParameters.year) : null;

      let startKey = undefined;
      const items = [];
      do {
        const res = await ddb.send(
          new ScanCommand({
            TableName: tableName,
            ExclusiveStartKey: startKey,
            ...(year != null && Number.isFinite(year)
              ? {
                  FilterExpression: '#doc.#year = :y',
                  ExpressionAttributeNames: { '#doc': 'doc', '#year': 'year' },
                  ExpressionAttributeValues: { ':y': year }
                }
              : {})
          })
        );
        for (const it of res.Items ?? []) items.push(it);
        startKey = res.LastEvaluatedKey;
      } while (startKey);

      const out = items
        .map((it) => {
          const y = it?.doc?.year;
          if (typeof y !== 'number') return null;
          const kind = it?.kind;
          if (kind !== 'draft' && kind !== 'published') return null;
          return { eventId: it.eventId, year: y, kind, updatedAt: it.updatedAt ?? null };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          const au = a.updatedAt ?? '';
          const bu = b.updatedAt ?? '';
          if (au !== bu) return bu.localeCompare(au);
          if (a.eventId !== b.eventId) return a.eventId.localeCompare(b.eventId);
          return a.kind.localeCompare(b.kind);
        });

      return json(200, out);
    }

    if (scoring && m === 'GET') {
      const item = await getDoc(tableName, scoring.eventId, scoring.kind);
      if (!item) return json(404, { error: 'Not found' });
      return json(200, item.doc);
    }

    if (scoring && scoring.kind === 'draft' && m === 'PUT') {
      const admin = getAdminIdentity(event);
      if (!admin) return json(401, { error: 'Unauthorized' });

      const body = event.body ? JSON.parse(event.body) : null;
      if (!body || typeof body !== 'object') return json(400, { error: 'Invalid JSON body' });
      if (body.eventId && body.eventId !== scoring.eventId) return json(400, { error: 'eventId mismatch' });

      const saved = await putDoc(tableName, scoring.eventId, 'draft', body, admin);
      return json(200, { ok: true, updatedAt: saved.updatedAt });
    }

    if (publishEventId && m === 'POST') {
      const admin = getAdminIdentity(event);
      if (!admin) return json(401, { error: 'Unauthorized' });

      const draft = await getDoc(tableName, publishEventId, 'draft');
      if (!draft) return json(404, { error: 'No draft to publish' });

      const doc = draft.doc;
      const now = new Date().toISOString();
      const published = {
        ...doc,
        status: 'published',
        updatedAt: now,
        updatedBy: admin,
        publishedAt: now,
        publishedBy: admin
      };

      await putDoc(tableName, publishEventId, 'published', published, admin);
      return json(200, { ok: true, publishedAt: now });
    }

    return json(404, { error: 'Unknown route' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Server error' });
  }
};
