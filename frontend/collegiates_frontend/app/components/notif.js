import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearSuccessMsg } from "@/lib/slices/success";



function SuccessNotif() {

    const dispatch = useAppDispatch();
    const success = useAppSelector(state => state.success.message);


    return (
        <>
            {success ?
                <div className="toast">
                    <div className="alert alert-success">
                        <span>{success}</span>
                        <button className="btn btn-success btn-circle" onClick={()=>dispatch(clearSuccessMsg())}>X</button>
                    </div>
                </div>
            : <></>}
        </>
    )
};

function ErrorNotif() {

    const dispatch = useAppDispatch();
    const success = useAppSelector(state => state.success.message);


    return (
        <>
            {success ?
                <div className="toast">
                    <div className="alert alert-success">
                        <span>{success}</span>
                        <button className="btn btn-success btn-circle" onClick={()=>dispatch(clearSuccessMsg())}>X</button>
                    </div>
                </div>
            : <></>}
        </>
    )
};

export {SuccessNotif};