import os
import time
import random
from playwright.sync_api import sync_playwright

# --- CONFIGURACIÓN ---
BASE_URL = "https://www.idealista.com/venta-viviendas/murcia-murcia/con-precio-hasta_220000,sin-inquilinos/pagina-{page}.htm"
START_PAGE = 1
END_PAGE = 10  # Ajusta el número total de páginas a descargar

OUTPUT_DIR = "html_downloads"
USER_DATA_DIR = "./chrome_user_data"  # Guarda cookies y sesión para reutilizar

os.makedirs(OUTPUT_DIR, exist_ok=True)

with sync_playwright() as p:
    # 1. Iniciar contexto persistente (guarda sesión, cookies y almacenamiento local)
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=False,  # Mantener visible para poder interactuar si salta un CAPTCHA
        viewport={'width': 1280, 'height': 800},
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        args=["--disable-blink-features=AutomationControlled"]
    )

    page = context.pages[0] if context.pages else context.new_page()

    # Ocultar indicador de automatización
    page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    """)

    for page_num in range(START_PAGE, END_PAGE + 1):
        url = BASE_URL.format(page=page_num)
        print(f"\n[+] Navegando a la página {page_num}: {url}")

        try:
            # 2. Cargar página
            page.goto(url, wait_until="domcontentloaded", timeout=30000)

            # 3. Espera inicial aleatoria (2 a 4 segundos)
            time.sleep(random.uniform(2.0, 4.0))

            # 4. Simulación de comportamiento humano: desplazamiento suave
            page.evaluate("window.scrollBy(0, 400);")

            # 5. Espera secundaria aleatoria (5 a 8 segundos)
            time.sleep(random.uniform(5.0, 8.0))

            html_content = page.content()

            # 6. Verificación de seguridad / CAPTCHA
            if "captcha" in page.url or "datadome" in html_content.lower():
                print(f"⚠️ CAPTCHA detectado en la página {page_num}.")
                print(" Por favor, resuélvelo manualmente en la ventana del navegador...")

                # Pausa hasta que se resuelva la verificación en la ventana
                while "captcha" in page.url or "datadome" in page.content().lower():
                    time.sleep(3)

                print("✓ CAPTCHA resuelto. Continuando...")
                html_content = page.content()

            # 7. Guardar archivo HTML localmente
            file_path = os.path.join(OUTPUT_DIR, f"pagina_{page_num}.html")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(html_content)

            print(f"✓ Guardado con éxito: {file_path}")

            # 8. Pausa larga aleatoria entre páginas (10 a 15 segundos)
            if page_num < END_PAGE:
                wait_time = random.uniform(10.0, 15.0)
                print(f"⏱️ Esperando {wait_time:.1f} segundos antes de la siguiente página...")
                time.sleep(wait_time)

        except Exception as e:
            print(f"❌ Error al procesar la página {page_num}: {e}")
            break

    context.close()
    print("\nProceso finalizado. Todos los HTML se han guardado en la carpeta:", OUTPUT_DIR)
