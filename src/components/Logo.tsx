import { useState } from 'react'

type LogoProps = {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
}

export function Logo({ size = 'md' }: LogoProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={`${sizes[size]} shrink-0 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-white/40`}
    >
      {failed ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b1f33] to-[#1c4566] text-sm font-extrabold text-[#e8d5a3]">
          כ
        </div>
      ) : (
        <img
          src="/logo.png"
          alt="לוגו כרמלי"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
