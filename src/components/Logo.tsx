import { useState } from 'react'

type LogoProps = {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
}

export function Logo({ size = 'md' }: LogoProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={`${sizes[size]} shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200`}
    >
      {failed ? (
        <div className="flex h-full w-full items-center justify-center bg-[#2563eb] text-xs font-extrabold text-white">
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
