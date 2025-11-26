module.exports = {
  apps: [
    {
      name: "smartdvm-next",
      script: "npm",
      args: "run start",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://smartdvm_admin:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm?sslmode=require",
        OWNER_DATABASE_URL: "postgresql://smartdvm_admin:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm_owner?sslmode=require"
      }
    },
    {
      name: "smartdvm-ws",
      script: "npm",
      args: "run ws:production",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://smartdvm_admin:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm?sslmode=require",
        OWNER_DATABASE_URL: "postgresql://smartdvm_admin:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm_owner?sslmode=require"
      }
    }
  ]
}
