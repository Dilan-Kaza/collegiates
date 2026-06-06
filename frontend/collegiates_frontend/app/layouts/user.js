function UserLayout({ navBar, header, children }) {
    return (
        <>
            <div
                id="bg-component"
                className="bg-tertiary fixed h-screen w-full absolute -top-[0svh] left-0 -z-20"
            />

            <div className="">
                {navBar}
            </div>
            <div
                className="antialiased text-dark font-grotesk lg:w-[80%] lg:translate-x-[12.5%] my-2"
            >
                {header}

                <div>{children}</div>
            </div>
        </>
    );
}

export { UserLayout };