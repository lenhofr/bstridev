'use strict';

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

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

async function getDoc(tableName, eventId, kind) {
  const res = await ddb
    .get({
      TableName: tableName,
      Key: { eventId, kind }
    })
    .promise();
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

  await ddb
    .put({
      TableName: tableName,
      Item: next
    })
    .promise();

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

  try {
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
