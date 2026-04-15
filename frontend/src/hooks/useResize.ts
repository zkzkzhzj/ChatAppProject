import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizeOptions {
  min: number;
  max: number;
  initial: number;
}

type ResizeAxis = 'x' | 'y';

/**
 * 드래그로 크기를 조절하는 훅.
 *
 * startResize는 안정적인 참조를 유지한다 (deps에 value 없음).
 * 드래그 시작 시점의 value를 클로저로 캡처하므로 리렌더링과 무관하게 동작한다.
 *
 * @returns [currentValue, startResize] — 현재 크기와 mouseDown 핸들러
 */
export function useResize(
  axis: ResizeAxis,
  { min, max, initial }: UseResizeOptions,
): [number, (e: React.MouseEvent) => void] {
  const [value, setValue] = useState(initial);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startPos = axis === 'y' ? e.clientY : e.clientX;
      const startValue = valueRef.current;

      const onMouseMove = (ev: MouseEvent) => {
        const currentPos = axis === 'y' ? ev.clientY : ev.clientX;
        const delta = axis === 'y' ? startPos - currentPos : currentPos - startPos;
        setValue(Math.min(max, Math.max(min, startValue + delta)));
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [axis, min, max],
  );

  return [value, startResize];
}
