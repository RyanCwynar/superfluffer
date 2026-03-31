module.exports = {
  apps: [
    {
      name: "superfluffer",
      cwd: "./app",
      script: "node_modules/.bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "deploy-hook",
      script: "./deploy/webhook-server.js",
      env: {
        DEPLOY_PORT: 9000,
        GITHUB_WEBHOOK_SECRET: "7a050cdc6f0a3a5c2213a60c257d7c4698bf583b107a9ef1c97dd4a9359ce5b4",
      },
    },
  ],
};
