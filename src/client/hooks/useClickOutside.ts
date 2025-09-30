// src/client/hooks/useClickOutside.js
import { useEffect, RefObject } from "react"

type Event = MouseEvent | TouchEvent;

export default function useClickOutside<T extends HTMLElement = HTMLElement>(ref: RefObject<T>, handler: (event: Event) => void) {
	useEffect(() => {
		const listener = (event: Event) => {
			if (!ref.current || ref.current.contains(event.target)) {
				return
			}
			handler(event)
		}
		document.addEventListener("mousedown", listener)
		document.addEventListener("touchstart", listener)
		return () => {
			document.removeEventListener("mousedown", listener)
			document.removeEventListener("touchstart", listener)
		}
	}, [ref, handler])
}
