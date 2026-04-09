import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";

type LightboxPayload = { url: string; alt: string };

const ImageLightboxContext = createContext<{
  open: (url: string, alt: string) => void;
  close: () => void;
} | null>(null);

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<LightboxPayload | null>(null);

  const close = useCallback(() => setPayload(null), []);
  const open = useCallback((url: string, alt: string) => {
    const u = url.trim();
    if (!u) {
      return;
    }
    setPayload({ url: u, alt: alt.trim() || "Imagen" });
  }, []);

  useEffect(() => {
    if (!payload) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [payload, close]);

  return (
    <ImageLightboxContext.Provider value={{ open, close }}>
      {children}
      {payload ? (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
          onClick={close}
        >
          <button
            type="button"
            className="image-lightbox__close"
            onClick={close}
            aria-label="Cerrar imagen ampliada"
          >
            Cerrar
          </button>
          <img
            className="image-lightbox__image"
            src={payload.url}
            alt={payload.alt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </ImageLightboxContext.Provider>
  );
}

export function useImageLightbox() {
  const ctx = useContext(ImageLightboxContext);
  if (!ctx) {
    throw new Error("useImageLightbox debe usarse dentro de ImageLightboxProvider");
  }
  return ctx;
}

export type ZoomableImageProps = {
  src: string;
  alt: string;
  wrapperClassName?: string;
  zoomLabel?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

/** Misma apariencia que un `<img>` suelto (sin botón envolvente); útil para portadas y cabeceras. */
export function ZoomableCoverImg({
  src,
  alt,
  className,
  loading,
  zoomLabel,
  ...imgRest
}: Omit<ZoomableImageProps, "wrapperClassName">) {
  const { open } = useImageLightbox();
  const trimmed = src.trim();
  if (!trimmed) {
    return null;
  }

  const label = zoomLabel ?? (alt.trim() ? `Ampliar imagen: ${alt}` : "Ampliar imagen");

  return (
    <img
      {...imgRest}
      className={className}
      src={trimmed}
      alt={alt}
      loading={loading}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => open(trimmed, alt)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(trimmed, alt);
        }
      }}
    />
  );
}

export function ZoomableImage({
  src,
  alt,
  className,
  wrapperClassName,
  zoomLabel,
  loading,
  ...imgRest
}: ZoomableImageProps) {
  const { open } = useImageLightbox();
  const trimmed = src.trim();
  if (!trimmed) {
    return null;
  }

  const label = zoomLabel ?? (alt.trim() ? `Ampliar imagen: ${alt}` : "Ampliar imagen");

  return (
    <button
      type="button"
      className={["zoomable-image__btn", wrapperClassName].filter(Boolean).join(" ")}
      aria-label={label}
      onClick={() => open(trimmed, alt)}
    >
      <img className={className} src={trimmed} alt={alt} loading={loading} {...imgRest} />
    </button>
  );
}
