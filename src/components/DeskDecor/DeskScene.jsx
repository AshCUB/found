import { Fragment, useState } from 'react';
import { decorationSize, findDeskDecoration, findDeskMaterial } from '../../data/deskDecor';
import './DeskScene.css';

const loadImage = (src) => {
  const img = new Image();
  img.src = src;
  return img.decode();
};

// Loads a desk's images ahead of showing it, so it appears all at once. Never rejects: missing images are skipped.
export function preloadDesk({ materialId, decorations }) {
  const srcs = [findDeskMaterial(materialId)?.image, ...decorations.map((placed) => findDeskDecoration(placed.id)?.image)];
  return Promise.allSettled(srcs.filter(Boolean).map(loadImage));
}

// A desk: the material photo filling the box, with decorations placed on it. Positions are shares of the box's size,
// and decorations are sized relative to its shorter side, so the same desk looks the same in any box (the Desk tab's
// preview and the full-screen backdrop behind the envelope).
// `setup` must be normalized (see normalizeDeskSetup). `renderDecoration(placed, decoration, image, props)` can wrap
// each decoration (e.g. to make it draggable); it must spread `props` (position and size) onto its outer element.
export default function DeskScene({ setup, className = '', deskRef, renderDecoration, children, ...props }) {
  const [brokenImages, setBrokenImages] = useState(() => new Set());
  const markBroken = (src) => setBrokenImages((broken) => new Set(broken).add(src));
  const material = findDeskMaterial(setup.materialId);

  return (
    <div ref={deskRef} className={`desk-scene ${className}`} {...props}>
      {material && !brokenImages.has(material.image) && (
        <img
          className="desk-scene__material"
          src={material.image}
          alt=""
          draggable="false"
          onError={() => markBroken(material.image)}
        />
      )}
      {setup.decorations.map((placed) => {
        const decoration = findDeskDecoration(placed.id);
        if (!decoration || brokenImages.has(decoration.image)) return null;
        const props = {
          className: 'desk-scene__decoration',
          style: { left: `${placed.x * 100}%`, top: `${placed.y * 100}%`, '--decoration-size': decorationSize(decoration) },
        };
        const image = (
          <img src={decoration.image} alt="" draggable="false" onError={() => markBroken(decoration.image)} />
        );
        return (
          <Fragment key={placed.id}>
            {renderDecoration ? renderDecoration(placed, decoration, image, props) : <div {...props}>{image}</div>}
          </Fragment>
        );
      })}
      {children}
    </div>
  );
}
