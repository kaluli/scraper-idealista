import styles from './AppSiteFooter.module.css'

const LINKEDIN = 'https://www.linkedin.com/in/karina-pangaro/'

export function AppSiteFooter() {
  return (
    <footer className={styles.root} role="contentinfo" aria-label="Autor">
      <p className={styles.line}>
        by{' '}
        <a
          href={LINKEDIN}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          KALU
        </a>
      </p>
    </footer>
  )
}
