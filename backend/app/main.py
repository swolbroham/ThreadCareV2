from fastapi import FastAPI

app = FastAPI() 

@app.get("/")
async def root():
    return {"message": "Threadcare app backend"}

@app.get("/health")
async def health():
    return {"status":"ok"}