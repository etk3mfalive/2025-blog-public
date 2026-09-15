import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const ANIMATION_DELAY = 0.1
export const INIT_DELAY = 0.3
export const CARD_SPACING = 36
export const CARD_SPACING_SM = 24

export function getFileExt(filename: string): string {
	const idx = filename.lastIndexOf('.')
	return idx === -1 ? '' : filename.slice(idx)
}
