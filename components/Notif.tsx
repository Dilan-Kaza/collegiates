"use client";

import { clearNotif } from "@slices";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// Single toast notification. Reads the one `notif` slice; `isError` selects the
// success vs error styling.
function Notif() {

    const dispatch = useAppDispatch();
    const { message, isError } = useAppSelector(state => state.notif);

    if (!message) return null;

    // Full class names must appear as literals so Tailwind/daisyUI don't purge
    // them — don't build these with string interpolation.
    const alertClass = isError ? "alert alert-error" : "alert alert-success";
    const btnClass = isError ? "btn btn-error btn-circle" : "btn btn-success btn-circle";

    return (
        <div className="toast">
            <div className={alertClass}>
                <span>{message}</span>
                <button className={btnClass} onClick={() => dispatch(clearNotif())}>X</button>
            </div>
        </div>
    )
};

export { Notif };
