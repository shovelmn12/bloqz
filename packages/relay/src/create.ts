import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  type Relay,
  type EventsMap,
  type TopicEvent,
  type Handler,
  type WildcardHandler,
} from './types';

/**
 * Creates a new Relay (event bus) instance.
 *
 * @template Events The map of possible event types.
 * @returns {Relay<Events>} A new Relay instance.
 */
export function createRelay<Events extends EventsMap>(): Relay<Events> {
  const subject = new Subject<TopicEvent<Events>>();

  return {
    emit<T extends keyof Events>(topic: T, event: Events[T]): void {
      subject.next({
        topic,
        event,
      });
    },
    on<T extends keyof Events>(
      topic: T | '*',
      callback: Handler<Events[T]> | WildcardHandler<Events>
    ): () => void {
      let subscription;

      if (topic === '*') {
        subscription = subject.subscribe((topicEvent: TopicEvent<Events>) => {
          (callback as WildcardHandler<Events>)(
            topicEvent.topic,
            topicEvent.event
          );
        });
      } else {
        subscription = subject
          .pipe(
            filter(
              (topicEvent: TopicEvent<Events>) => topicEvent.topic === topic
            ),
            map(
              (topicEvent: TopicEvent<Events>) => topicEvent.event as Events[T]
            )
          )
          .subscribe(callback as Handler<Events[T]>);
      }

      return () => subscription.unsubscribe();
    },
    dispose(): void {
      subject.complete();
    },
  };
}
