import postgres from "postgres";

const sql = postgres(
    process.env.POSTGRES_URL || "postgres://postgres:password@localhost:5432/myapp",
    {
        stats: true
    }
);

export default sql;
