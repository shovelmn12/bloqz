import { EventHandler, EventTypeOf, ExtractEventByType } from "@/models";

/**
 * A mapped type representing the structure for the handlers object.
 * Keys are the string literal types from the Event union's 'type' property.
 * Values can be either the EventHandler function directly, or an EventHandlerDefinition object.
 * Keys are optional.
 *
 * @template Event The base event union type (must have a 'type' string property).
 * @template State The state type for the Bloc.
 */
export type EventHandlersObject<Event, State> = {
  [TType in EventTypeOf<Event>]?: EventHandler<
    // Uses the new union type
    ExtractEventByType<Event, TType>,
    State
  >;
};
