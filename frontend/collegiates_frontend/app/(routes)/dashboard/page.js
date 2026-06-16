"use client"

import { Button } from "@/app/components/button";
import { UserLayout } from "@/app/layouts/layouts"
import { useCurrentUser } from "@/hooks/userApiHooks"

export default function Dashboard (){
    
    const userinfo = useCurrentUser();
    
    return (        
        <UserLayout>
            <div className="bg-off-white grid grid-cols-3 rounded-lg px-[10%]">
                <div className="flex-row text-4xl p-1">
                    {userinfo.first_name} {userinfo.last_name}
                </div>
                <div className="flex flex-cols-3 p-1">
                    <div className="flex-1"/>
                    <div className="flex-1 content-center">
                        <Button isLink="true">Register</Button>
                    </div>
                    <div className="flex-1"/>
                </div>
                <div className="p-1 py-15">
                    email: {userinfo.email}<br/>
                    gender: {userinfo.gender}<br/>
                    school: {userinfo.school}<br/>
                    student type: {userinfo.student_type}<br/>
                    first comp: {userinfo.first_comp}<br/>
                    skill level: {userinfo.skill_level}<br/>
                    user type: {userinfo.user_type}
                </div>
            </div>
        </UserLayout>
    )
}