import { describe, it, expect } from "vitest";
import { useCreateBloc } from "../src/utils/create";
import { renderHook } from "@testing-library/react";

describe("useCreateBloc", () => {
  it("should create a bloc and close it on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useCreateBloc({
        initialState: { count: 0 },
        handlers: {},
      })
    );

    const bloc = result.current;
    expect(bloc.isClosed).toBe(false);

    unmount();
    expect(bloc.isClosed).toBe(true);
  });
});
