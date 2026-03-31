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
      },
    },
  ],
};
