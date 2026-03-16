module.exports = {
  apps: [{
    name: "superfluffer",
    cwd: "./app",
    script: "node_modules/.bin/next",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
  }],
};
