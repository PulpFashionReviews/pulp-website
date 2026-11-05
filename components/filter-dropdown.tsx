'use client';

import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

type Option = { value: string; label: string };

type BaseProps = {
  label: string;
  options: Option[];
  className?: string;
};

type MultiProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

/**
 * A styled dropdown matching the directory's search box.
 * `multiple` gives checkmark options that stay open while picking;
 * otherwise it behaves like a select and closes on choice.
 */
export function FilterDropdown(props: MultiProps | SingleProps) {
  const { label, options, className } = props;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const isSelected = (v: string) => (props.multiple ? props.value.includes(v) : props.value === v);

  const summary = props.multiple
    ? props.value.length === 0
      ? label
      : props.value.length === 1
        ? props.value[0]
        : `${label} · ${props.value.length}`
    : options.find((o) => o.value === props.value)?.label ?? label;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const first = Math.max(0, options.findIndex((o) => isSelected(o.value)));
      setActive(first);
      requestAnimationFrame(() => listRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function choose(v: string) {
    if (props.multiple) {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
      setOpen(false);
    }
  }

  function onListKey(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[active]) choose(options[active].value); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); }
  }

  const hasSelection = props.multiple && props.value.length > 0;

  return (
    <div className={`fdrop ${open ? 'is-open' : ''} ${hasSelection ? 'has-value' : ''} ${className ?? ''}`} ref={rootRef}>
      <button
        type="button"
        className="fdrop-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="fdrop-label">{summary}</span>
        <svg className="fdrop-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className="fdrop-panel">
          <ul
            id={`${id}-list`}
            ref={listRef}
            role="listbox"
            aria-label={label}
            aria-multiselectable={props.multiple || undefined}
            aria-activedescendant={`${id}-opt-${active}`}
            tabIndex={-1}
            onKeyDown={onListKey}
          >
            {options.map((o, i) => {
              const selected = isSelected(o.value);
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  className={`${selected ? 'selected' : ''} ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                >
                  <span className={`fdrop-check ${props.multiple ? 'box' : 'tick'}`} aria-hidden="true">
                    {selected && (
                      <svg viewBox="0 0 12 12"><path d="M2.5 6.3 5 8.7l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                  {o.label}
                </li>
              );
            })}
          </ul>
          {props.multiple && (
            <div className="fdrop-footer">
              <button type="button" onClick={() => props.onChange([])} disabled={props.value.length === 0}>Clear</button>
              <button type="button" className="fdrop-done" onClick={() => setOpen(false)}>Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
