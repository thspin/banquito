
import asyncio
import httpx
import os
import time

# URL de la API en Render (se puede configurar vía variable de entorno)
API_URL = os.getenv("API_URL", "https://banquito-api.onrender.com")

async def keep_alive():
    """
    Realiza una petición periódica a la API para evitar que Render inactive la instancia free.
    """
    print(f"🚀 Iniciando Keep-Alive para {API_URL}...")
    
    # Esperar un poco a que la app termine de arrancar si es necesario
    await asyncio.sleep(10)
    
    async with httpx.AsyncClient() as client:
        while True:
            try:
                # El endpoint /health es ligero y perfecto para esto
                response = await client.get(f"{API_URL}/health")
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Keep-alive ping: {response.status_code}")
            except Exception as e:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Keep-alive error: {e}")
            
            # Esperar 14 minutos (Render inactiva tras 15 min de inactividad)
            await asyncio.sleep(14 * 60)

if __name__ == "__main__":
    try:
        asyncio.run(keep_alive())
    except KeyboardInterrupt:
        print("Stopping keep-alive script...")
