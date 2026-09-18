import { useEffect, useState } from 'react'

export function useVisualViewportBox() {
  const [box, setBox] = useState(() => ({
    height: typeof window === 'undefined' ? 800 : Math.round(window.visualViewport?.height ?? window.innerHeight),
    offsetTop: typeof window === 'undefined' ? 0 : Math.round(window.visualViewport?.offsetTop ?? 0),
  }))

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      setBox({
        height: Math.round(vv?.height ?? window.innerHeight),
        offsetTop: Math.round(vv?.offsetTop ?? 0),
      })
    }
    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return box
}
