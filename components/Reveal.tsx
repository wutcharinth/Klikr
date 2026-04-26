"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
};

export function Reveal({ children, delay, className = "", as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const cls = ["reveal", visible ? "is-visible" : "", delay ? `delay-${delay}` : "", className]
    .filter(Boolean)
    .join(" ");

  // The runtime component type from a generic Tag string isn't inferable for refs;
  // a cast keeps the API ergonomic while the DOM node is what we actually attach to.
  const Component = Tag as unknown as React.ElementType;
  return (
    <Component ref={ref as React.Ref<HTMLElement>} className={cls}>
      {children}
    </Component>
  );
}
