# Backend

```
jest.mock('../utils/env', () => ({
  envUtility: {
    POSTGRES_HOST: 'localhost', POSTGRES_PORT: 5432, POSTGRES_USER: 'test',
    POSTGRES_PASSWORD: 'test', POSTGRES_DB: 'test', PORT: 3000,
    SWAGGER_ENABLED: false, REGION: 'us-east-2',
    AUTH_COGNITO_APP_CLIENT_ID: 'test-client', AUTH_COGNITO_USER_POOL_ID: 'us-east-2_test',
  },
}));
```

# Frontend
```
jest.mock('../utils/env', () => ({
  envUtility: {
    VITE_COGNITO_APP_CLIENT_ID: 'test-client',
    VITE_COGNITO_USER_POOL_ID: 'us-east-2_test',
    VITE_API_BASE_URL: 'http://localhost:3000',
  },
}));
```