import { useFormStatus } from "react-dom";

export const SubmitButton = ({ text, activeText }: { text: string; activeText: string }) => {
    const { pending } = useFormStatus();

    return (
        <button
            className='w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition disabled:opacity-50'
            type='submit'
            disabled={pending}
        >
            {!pending ? text : activeText}
        </button>
    );
};