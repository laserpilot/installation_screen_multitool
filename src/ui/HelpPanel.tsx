import { useState } from 'react';

export function HelpPanel() {
  const [open, setOpen] = useState(true);
  return (
    <div className="panel help">
      <button className="help-head" onClick={() => setOpen((o) => !o)}>
        <span>How to use this tool</span>
        <span className="chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="help-body">
          <p>
            Set a screen size, mount height, and viewing context, and the report
            below tells you whether the placement is reachable, comfortable to see,
            and sharp enough — judged against three constraints:
          </p>
          <ul>
            <li>
              <b>Reach (ADA)</b> — touch targets should sit in the 15–48" band off
              the floor (green band in the scene).
            </li>
            <li>
              <b>Visual angle</b> — how much of your field of view the screen fills.
              A <i>touch</i> screen (used at arm's length) tolerates a much wider
              angle than a display you <i>view</i> from across the room, so the tool
              judges the two modes differently.
            </li>
            <li>
              <b>Resolution</b> — whether pixels (or LED pixel pitch) are visible at
              the viewing distance.
            </li>
          </ul>
          <p>
            <b>Touch vs View mode</b> — Touch fixes the viewer at arm's length (the
            distance you're forced to when reaching the glass). View lets you set how
            far back people stand.
          </p>
          <p>
            <b>The viewer</b> is a 50th-percentile (average) body — adult, child, or
            seated wheelchair user. The translucent bubble is their arm-reach
            envelope; the dot on the screen is where they'd touch (red = can't reach).
          </p>
          <p>
            <b>"View from their eyes"</b> puts the camera at the viewer's eye position
            with a ~55° field of view, roughly an average person's comfortable visual
            field. If the screen spills past the edges of the frame, it's too big for
            an average viewer at that distance.
          </p>
          <p>
            <b>2D plan</b> gives a dimensioned side-elevation drawing you can{' '}
            <b>export as SVG</b> for documentation.
          </p>
        </div>
      )}
    </div>
  );
}
