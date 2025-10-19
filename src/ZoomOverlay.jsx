import { memo } from "react";

function ZoomOverlayComponent({ isOpen, onRequestClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="zoom-overlay is-open" role="dialog" aria-modal="false">
      <div className="zoom-overlay__scrim" />
      <div className="zoom-overlay__window is-active">
        <div className="analysis-window">
          <button
            type="button"
            className="analysis-window__close"
            aria-label="Close analysis window"
            onClick={onRequestClose}
          >
            <span aria-hidden>×</span>
          </button>
          <div className="analysis-window__chrome">
            <div className="analysis-window__brand">
              <span className="analysis-window__title">RADUGA</span>
              <span className="analysis-window__subtitle">DESIGN</span>
            </div>
            <div className="analysis-window__ruler" />
            <div className="analysis-window__sequence">692859968</div>
          </div>

          <div className="analysis-window__content">
            <div className="analysis-window__meta">
              <span>ID 251</span>
              <span>LABEL 544</span>
              <span>USER 326</span>
            </div>

            <div className="analysis-window__display">
              <div className="analysis-window__grid">
                <div className="analysis-window__blob" />
              </div>
              <ul className="analysis-window__markers">
                <li>6828 8968</li>
                <li>68289978</li>
                <li>69592</li>
              </ul>
            </div>

            <div className="analysis-window__log">
              <code>{`"model": "vesij",`}</code>
              <code>{`"pool": "avg",`}</code>
              <code>{`"padding": "valid"`}</code>
              <code>{`self.model := None`}</code>
              <code>{`self.eval := None`}</code>
              <code>{`self.feed ()`}</code>
              <code>{`self.modules []`}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ZoomOverlay = memo(ZoomOverlayComponent);
