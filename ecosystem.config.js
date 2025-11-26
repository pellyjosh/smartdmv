module.exports = {
  apps: [
    {
      name: "smartdvm-next",
      script: "npm",
      args: "run start",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
        DATABASE_URL: "your_db_url_here",
        OWNER_DATABASE_URL: "your_owner_db_url_here"
      }
    },
    {
      name: "smartdvm-ws",
      script: "npm",
      args: "run ws:production",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "your_db_url_here",
        OWNER_DATABASE_URL: "your_owner_db_url_here"
      }
    }
  ]
}
