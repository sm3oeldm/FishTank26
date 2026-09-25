process.env.DATABASE_URL = "file:./test.db";
process.env.DEMO_MODE = "true";
delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;
