import styles from "./website-builder.module.css";

type Props = {
  message: string;
  onClose: () => void;
  onPublishAnyway?: () => void;
  disabled?: boolean;
};

export default function EditorNotice({ message, onClose, onPublishAnyway, disabled }: Props) {
  if (!message) return null;
  return <div className={`${styles.notice} ${styles.editorNotice}`} role="status">
    <span>{message}</span>
    <span className={styles.noticeActions}>
      {onPublishAnyway ? <button type="button" className={styles.publishAnyway} disabled={disabled} onClick={onPublishAnyway}>Publicar igualmente</button> : null}
      <button type="button" aria-label="Cerrar aviso" onClick={onClose}>Cerrar</button>
    </span>
  </div>;
}
