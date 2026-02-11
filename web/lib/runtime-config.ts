export const runtimeConfig = {
  scoringApiBaseUrl: process.env.NEXT_PUBLIC_SCORING_API_BASE_URL ?? null,
  cognitoHostedUiDomain: process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI_DOMAIN ?? null,
  cognitoUserPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? null,
  cognitoUserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? null
};

export function hasBackendConfig() {
  return Boolean(
    runtimeConfig.scoringApiBaseUrl &&
      runtimeConfig.cognitoHostedUiDomain &&
      runtimeConfig.cognitoUserPoolClientId
  );
}
