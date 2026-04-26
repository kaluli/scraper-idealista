import styles from './AppSiteFooter.module.css'

const LINKEDIN = 'https://www.linkedin.com/in/karina-pangaro/'

export function AppSiteFooter() {
  return (
    <footer className={styles.root} role="contentinfo" aria-label="Autor">
      <p className={styles.line}>
        <span className={styles.pre}>by</span>
        <a
          href={LINKEDIN}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          kalu
        </a>
      </p>
    </footer>
  )
}
