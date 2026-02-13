/**
 * @module @bloqz/react-relay
 * @description
 * This package provides React bindings for the `@bloqz/relay` event bus,
 * allowing you to easily integrate a central event-driven architecture
 * into your React applications.
 *
 * It includes the `RelayProvider` to initialize and provide the event bus,
 * and the `useRelay` hook to access it from any component.
 */

export { RelayContext } from "./context.js";
export { RelayProvider } from "./provider.js";
export type { RelayProviderProps } from "./provider.js";
export { useRelay } from "./hooks.js";
export * from "@bloqz/relay";
