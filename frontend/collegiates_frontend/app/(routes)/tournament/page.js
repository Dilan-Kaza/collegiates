"use client"

import { UserLayout } from "@/app/layouts/layouts";
import { useState } from "react";

export default function Tournament() {

  const placeholderDate = {"name":"Tournament",
                           "host":"University of College, Lmao",
                           "date":"Now",
                           "earlyReg":"last month",
                           "earlyRegBase":"100",
                           "earlyRegEvent":"20",
                           "lateReg":"last month",
                           "lateRegBase":"500",
                           "lateRegEvent":"70",
                           "enrollDate":"yesterday"};

  const [compData, SetCompData] = useState(placeholderDate);

  return (
    <UserLayout header={null}>
      <div className="relative overflow-hidden">
        <img src="test_img_1.png" className="w-full opacity-70"/>

        <div className="absolute inset-[5%] flex flex-col text-off-white pt-24">
          <div className="text-6xl">
            {compData.name}
          </div>
          <div className="text-2xl pt-10">
            Host: {compData.host}<br/>
            Date: {compData.date}<br/>  
          </div>
          <div className="text-2xl font-bold pt-10">
              Registration Instructions
          </div>
          <div className="translate-x-4">
            Create a competitor account or log in<br/>
            <br/>
            After logging in, click on "Register Individual Events" and follow the instructions to register for your individual events.<br/>
            ** If you are part of a groupset for Team Competition, make sure you select the event checkbox for the 
            "Group Set Event" as you select all your other individual events. If you do not, you will not be able to create or 
            join a team in step four.<br/>
            <br/>
            If you are in a groupset, after you finish registering your individual events, you must also then click on 
            "Register for Team Competition" from your Account Panel.<br/>
            ** If you are team captain, you must create your team before the rest of your team can join. Your group members will 
            able to join your team by selecting the team name from the dropdown menu.<br/>
          </div>
        </div>
      </div>
      <div className="bg-off-white py-20">
        <div className="text-secondary text-6xl px-[5%]">
          Registration
        </div>
        <div className="text-primary pt-15 px-[5%]">
          Early Registration Deadline: {compData.earlyReg}<br/>
          - Registration fees: ${compData.earlyRegBase} for the first event + ${compData.earlyRegEvent} per additional event<br/>
          <br/>
          Early Registration Deadline: {compData.lateReg}<br/>
          - Registration fees: ${compData.lateRegBase} for the first event + ${compData.lateRegEvent} per additional event<br/>
          <br/>
          <br/>
          **Base registration fee includes the cost of one event.
        </div>
      </div>
      <div className="bg-primary text-secondary py-20">
        <div className="text-6xl px-[5%]">
          <a href="rules" className="hover:underline">Judging and Rules</a>
        </div>
      </div>
      <div className="bg-off-white py-20">
        <div className="text-secondary text-6xl px-[5%]">
          Competitor<br/>
          <a className="font-bold">Documentation</a>
        </div>
        <div className="text-4xl px-[5%] pt-15 font-bold">
          Proof of Enrollment
        </div>
        <div className="text-primary pt-15 px-[5%]">
          Remember to prepare documentation for <a className="font-bold italic">Proof of Enrollment</a>! This is due <a className="font-bold">{compData.enrollDate}</a><br/>
          <br/>
          <br/>
          <br/>
          Per the Collegiate Wushu Tournament rules (which can be found in the section above):
        </div>
        <div className="text-primary pt-15 px-[5%] translate-x-10">
          <a className="font-bold">Class 1 Competitors:</a><br/>
          Proof of current enrollment is required and must be sent in with registration materials before the competition.
           The proof may consist of an approved study list, transcript, or research curriculum for the present semester or
            quarter at the student's university. The study list must include the student's name and a date or time period 
            for which it applies, in order to prove present enrollment. A student ID is not sufficient proof. The study list 
            or transcript should also indicate that the student is taking at least the minimum number of units or credits at 
            his or her university to qualify as a full-time student. 'Currently enrolled' is defined as having the status of 
            full-time student at the university on the day of competition.<br/>
          <br/>
          <a className="font-bold">Class 2 Competitors:</a><br/>
          Documentation is also required for Class 2 competitors, in the form of a photocopy of the competitor's diploma 
          (for alumnus) or formal document from the university's registrars office, such as a transcript for a previous term 
          (for non-enrolled students). Both the name and date should be visible on any such documentation and the printed date 
          of enrollment or graduation will be the date used for determining eligibility.<br/>
        </div>
      </div>
    </UserLayout>
  );
}
