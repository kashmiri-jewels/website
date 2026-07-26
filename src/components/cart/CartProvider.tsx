import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import type { Product } from '../../data/products'
import { getProductSize, getProductVariantById } from '../../data/products'
import { trackAnalyticsEvent } from '../../lib/analytics'

export type CartLine = {
  id: string
  productId: string
  variantId: string
  size: string
  quantity: number
}

export type CartLineWithProduct = CartLine & {
  product: Product
  maxQuantity: number
}

type AddCartItemInput = {
  product: Product
  size: string
  quantity?: number
}

type CartContextValue = {
  lines: CartLineWithProduct[]
  itemCount: number
  subtotal: number
  mrpTotal: number
  savings: number
  isOpen: boolean
  addedItem: AddedCartItem | null
  addItem: (input: AddCartItemInput) => void
  dismissAddedItem: () => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  setCartOpen: (open: boolean) => void
}

export type AddedCartItem = {
  product: Product
  quantity: number
  size: string
}

const cartStorageKey = 'kashmiri-jewels-cart'
const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartLines, setCartLines] = useState<CartLine[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [addedItem, setAddedItem] = useState<AddedCartItem | null>(null)
  const [hasLoadedCart, setHasLoadedCart] = useState(false)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(cartStorageKey)
      if (!savedCart) {
        setHasLoadedCart(true)
        return
      }

      const parsedCart = JSON.parse(savedCart) as CartLine[]
      if (Array.isArray(parsedCart)) {
        setCartLines(parsedCart.filter(isStoredCartLine))
      }
    } catch {
      setCartLines([])
    } finally {
      setHasLoadedCart(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedCart) return

    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartLines))
  }, [cartLines, hasLoadedCart])

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      trackAnalyticsEvent('cart_open')
    }

    wasOpenRef.current = isOpen
  }, [isOpen])

  const lines = useMemo(
    () =>
      cartLines
        .map((line) => {
          const product = getProductVariantById(line.variantId)
          if (!product) return null

          const size = getProductSize(product, line.size)
          const maxQuantity = size?.stockAvailable ?? 0

          if (maxQuantity < 1) return null

          return {
            ...line,
            product,
            maxQuantity,
            quantity: clampQuantity(line.quantity, maxQuantity, product.minOrderQuantity),
          }
        })
        .filter((line): line is CartLineWithProduct => Boolean(line)),
    [cartLines],
  )

  const totals = useMemo(
    () =>
      lines.reduce(
        (current, line) => ({
          itemCount: current.itemCount + line.quantity,
          subtotal: current.subtotal + line.product.sellingPricePaise * line.quantity,
          mrpTotal: current.mrpTotal + line.product.mrpPaise * line.quantity,
        }),
        { itemCount: 0, subtotal: 0, mrpTotal: 0 },
      ),
    [lines],
  )

  const addItem = useCallback(({ product, size, quantity = 1 }: AddCartItemInput) => {
    const sizeInventory = getProductSize(product, size)
    if (!sizeInventory || sizeInventory.stockAvailable < 1) return

    const maxQuantity = sizeInventory.stockAvailable
    const id = createCartLineId(product.productId, product.variantId, size)
    const safeQuantity = clampQuantity(quantity, maxQuantity, product.minOrderQuantity)

    setCartLines((currentLines) => {
      const existingLine = currentLines.find((line) => line.id === id)

      if (!existingLine) {
        return [
          ...currentLines,
          {
            id,
            productId: product.productId,
            variantId: product.variantId,
            size,
            quantity: safeQuantity,
          },
        ]
      }

      return currentLines.map((line) =>
        line.id === id
          ? {
              ...line,
              quantity: clampQuantity(line.quantity + safeQuantity, maxQuantity, product.minOrderQuantity),
            }
          : line,
      )
    })
    setAddedItem({ product, size, quantity: safeQuantity })
  }, [])

  const dismissAddedItem = useCallback(() => setAddedItem(null), [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setCartLines((currentLines) =>
      currentLines
        .map((line) => {
          if (line.id !== id) return line

          const product = getProductVariantById(line.variantId)
          const maxQuantity =
            product?.sizes.find((size) => size.label === line.size)?.stockAvailable ?? 0
          const minQuantity = product?.minOrderQuantity ?? 1

          return {
            ...line,
            quantity: clampQuantity(quantity, maxQuantity, minQuantity),
          }
        })
        .filter((line) => line.quantity > 0),
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    setCartLines((currentLines) => currentLines.filter((line) => line.id !== id))
  }, [])

  const clearCart = useCallback(() => setCartLines([]), [])

  const openCart = useCallback(() => {
    setAddedItem(null)
    setIsOpen(true)
  }, [])

  const closeCart = useCallback(() => setIsOpen(false), [])

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: totals.itemCount,
      subtotal: totals.subtotal,
      mrpTotal: totals.mrpTotal,
      savings: Math.max(0, totals.mrpTotal - totals.subtotal),
      isOpen,
      addedItem,
      addItem,
      dismissAddedItem,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      setCartOpen: setIsOpen,
    }),
    [
      addItem,
      addedItem,
      clearCart,
      closeCart,
      dismissAddedItem,
      isOpen,
      lines,
      openCart,
      removeItem,
      totals.itemCount,
      totals.mrpTotal,
      totals.subtotal,
      updateQuantity,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const cart = useContext(CartContext)

  if (!cart) {
    throw new Error('useCart must be used within CartProvider')
  }

  return cart
}

export function useOptionalCart() {
  return useContext(CartContext)
}

export function createCartLineId(productId: string, variantId: string, size: string) {
  return `${productId}:${variantId}:${size.trim().toLowerCase()}`
}

function clampQuantity(quantity: number, maxQuantity: number, minQuantity = 1) {
  if (maxQuantity < 1) return 0
  return Math.min(Math.max(Math.trunc(quantity), minQuantity), maxQuantity)
}

function isStoredCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== 'object') return false

  const line = value as CartLine
  return (
    typeof line.id === 'string' &&
    typeof line.productId === 'string' &&
    typeof line.variantId === 'string' &&
    typeof line.size === 'string' &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  )
}
