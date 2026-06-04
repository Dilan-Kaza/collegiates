import Link from "next/link";

function Button({ children, isLink = false }) {
  return (
    <>
      {isLink ? (
        <div className="flex ">
          <Link
            href={`/${children.toLowerCase().replace(/\s/g, "")}`}
            className="bg-primary rounded-full py-1 px-5 font-bold text-off-white"
          >
            {children}
          </Link>
        </div>
      ) : (
        <div className="flex ">
          <span className="bg-primary rounded-full py-1 px-5 font-bold text-off-white cursor-pointer">
            {children}
          </span>
        </div>
      )}
    </>
  );
}

function ButtonInverse({ children, isLink = false }) {
  return (
    <>
      {isLink ? (
        <div className="flex ">
          <Link
            href={`/${children.toLowerCase().replace(/\s/g, "")}`}
            className="bg-off-white rounded-full py-1 px-5 font-bold text-primary"
          >
            {children}
          </Link>
        </div>
      ) : (
        <div className="flex ">
          <span className="bg-primary rounded-full py-1 px-5 font-bold text-off-white cursor-pointer">
            {children}
          </span>
        </div>
      )}
    </>
  );
}

function LongButton({ children }) {
  return (
    <>
      <div className="flex">
        <span className="bg-primary rounded-full w-full py-2 text-lg font-bold text-off-white cursor-pointer">
          {children}
        </span>
      </div>
    </>
  );
}

export { Button, ButtonInverse, LongButton };
