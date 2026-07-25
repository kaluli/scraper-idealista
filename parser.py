import os
import time
import random
from playwright.sync_api import sync_playwright

# Carpeta local donde se guardará la sesión del navegador (cookies, caché, etc.)
USER_DATA_DIR = "./chrome_user_data"
OUTPUT_DIR = "html_downloads"

BASE_URL = "https://www.idealista.com/venta-viviendas/murcia-murcia/con-precio-hasta_220000,sin-inquilinos/pagina-{page}.htm"
START_PAGE = 1
END_PAGE = 10

os.makedirs(OUTPUT_DIR, exist_ok=True)

with sync_playwright() as p:
    # Lanza el contexto persistente.
    # En lugar de p.chromium.launch(), usamos launch_persistent_context
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=False,  # Mantenemos la ventana visible
        viewport={'width': 1280, 'height': 800},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        # Argumentos extra para suavizar la detección de automatización
        args=[
            "--disable-blink-features=AutomationControlled",
        ]
    )

    # Obtenemos la pestaña existente o creamos una nueva
    page = context.pages[0] if context.pages else context.new_page()

    # Opcional: Ocultar la propiedad navigator.webdriver
    page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    """)

    for page_num in range(START_PAGE, END_PAGE + 1):
        url = BASE_URL.format(page=page_num)
        print(f"Navegando a página {page_num}: {url}")
        
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Pausa aleatoria para imitar un comportamiento humano
            time.sleep(random.uniform(5.0, 9.0))
            
            html_content = page.content()
            
            # Si salta el CAPTCHA de DataDome, el script te da tiempo para resolverlo a mano.
            # Una vez resuelto, la cookie de validación se guardará en USER_DATA_DIR.
            if "captcha" in page.url or "datadome" in html_content.lower():
                print(f"⚠️ CAPTCHA/Bloqueo en la página {page_num}. Por favor, resuélvelo en la ventana del navegador...")
                
                # Espera interactiva hasta que la URL ya no contenga el captcha o cambie el contenido
                while "captcha" in page.url or "datadome" in page.content().lower():
                    time.sleep(3)
                
                print("✓ CAPTCHA resuelto. Guardando estado...")
                html_content = page.content()

            # Guardar el HTML
            file_path = os.path.join(OUTPUT_DIR, f"pagina_{page_num}.html")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            print(f"✓ Guardado: {file_path}")

        except Exception as e:
            print(f"❌ Error en página {page_num}: {e}")
            break

    # Guardar explícitamente el almacenamiento y cerrar
    context.close()
