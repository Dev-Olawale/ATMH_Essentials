"use client";

import { useState, useTransition, type FormEvent } from "react";

/**
 * Submits a form to a Server Action without React's automatic form reset, which would wipe what
 * the person typed whenever the action returns an error. Successful actions usually redirect or
 * refresh, which reloads the form with saved values.
 */
export function useFormAction<State>(
  action: (state: State, formData: FormData) => Promise<State>,
  initial: State,
) {
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setState(await action(state, formData));
    });
  };
  return { state, pending, onSubmit };
}
