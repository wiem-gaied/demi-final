import React from "react";
import Navbar from "../components/Navbar";
import { useState } from "react";


    
export default function Contact() {
    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    }
const faqs = [
        {
            question: "What is a GRC platform?",
            answer: "A GRC platform is a centralized system designed to help organizations manage governance policies, assess and mitigate risks, and ensure compliance with regulatory requirements. It streamlines processes, improves visibility, and enhances decision-making."
        },
        
        {
            question: "What does this GRC platform offer?",
            answer: "Our platform is an AI-powered GRC solution that helps organizations manage risks, ensure compliance, and generate professional security reports. It combines automation, intelligent insights, and a user-friendly interface."
        },
        {
            question: "How does the platform help with risk management?",
            answer: "The platform identifies, evaluates, and prioritizes risks. It allows users to assign risk levels, define mitigation actions, and track progress over time."
        },
        {
            question: "How does this platform improve productivity?",
            answer: "By automating risk analysis, compliance tracking, and report generation, the platform significantly reduces manual work and speeds up processes."
        },
        {
            question: "Why should I use this platform instead of traditional GRC tools?",
            answer: "Unlike traditional tools, this platform leverages AI to provide smarter insights, faster reporting, and a more intuitive user experience."
        },
        {
            question: "How is user access managed?",
            answer: "Access is controlled through roles and permissions, ensuring that users only see and modify what they are authorized to."
        },
        {
            question: "Can I customize report templates?",
            answer: "Yes, you can customize templates to match your organization’s needs, including structure, wording, and sections."
        },
        {
            question: "What type of reports are generated?",
            answer: "the platform can generate complete, structured security reports using predefined templates. It also enriches reports with contextual explanations and recommendations."
        }
    ]
    const mid = Math.ceil(faqs.length / 2)
    const columns = [faqs.slice(0, mid), faqs.slice(mid)]


    const [openIndex, setOpenIndex] = React.useState(null);
    return (
        <>
        <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', sans-serif" , paddingTop: "80px" }}>
        <Navbar />
        <form className="flex flex-col items-center text-sm text-slate-800">
            <p className="text-xs bg-indigo-200 text-indigo-600 font-medium px-3 py-1 rounded-full">Contact Us</p> 
            <h1 className="text-4xl font-bold py-4 text-center">Let’s Get In Touch.</h1>
            <p className="max-md:text-sm text-gray-500 pb-10 text-center">
                Or just reach out manually to us at <a href="#" className="text-indigo-600 hover:underline">systemadmingrc@gmail.com</a>
            </p>
            
            <div className="max-w-96 w-full px-4">
                <label htmlFor="name" className="font-medium">Full Name</label>
                <div className="flex items-center mt-2 mb-4 h-10 pl-3 border border-slate-300 rounded-full focus-within:ring-2 focus-within:ring-indigo-400 transition-all overflow-hidden">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.311 16.406a9.64 9.64 0 0 0-4.748-4.158 5.938 5.938 0 1 0-7.125 0 9.64 9.64 0 0 0-4.749 4.158.937.937 0 1 0 1.623.938c1.416-2.447 3.916-3.906 6.688-3.906 2.773 0 5.273 1.46 6.689 3.906a.938.938 0 0 0 1.622-.938M5.938 7.5a4.063 4.063 0 1 1 8.125 0 4.063 4.063 0 0 1-8.125 0" fill="#475569"/>
                    </svg>
                    <input type="text" className="h-full px-2 w-full outline-none bg-transparent" placeholder="Enter your full name" required />
                </div>
        
                <label htmlFor="email-address" className="font-medium mt-4">Email Address</label>
                <div className="flex items-center mt-2 mb-4 h-10 pl-3 border border-slate-300 rounded-full focus-within:ring-2 focus-within:ring-indigo-400 transition-all overflow-hidden">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.5 3.438h-15a.937.937 0 0 0-.937.937V15a1.563 1.563 0 0 0 1.562 1.563h13.75A1.563 1.563 0 0 0 18.438 15V4.375a.94.94 0 0 0-.938-.937m-2.41 1.874L10 9.979 4.91 5.313zM3.438 14.688v-8.18l5.928 5.434a.937.937 0 0 0 1.268 0l5.929-5.435v8.182z" fill="#475569"/>
                    </svg>
                    <input type="email" className="h-full px-2 w-full outline-none bg-transparent" placeholder="Enter your email address" required />
                </div>
        
                <label htmlFor="message" className="font-medium mt-4">Message</label>
                <textarea rows="4" className="w-full mt-2 p-2 bg-transparent border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus-within:ring-indigo-400 transition-all" placeholder="Enter your message" required></textarea>
                
                <button type="submit" className="flex items-center justify-center gap-1 mt-5 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 w-full rounded-full transition">
                    Submit Form
                    <svg className="mt-0.5" width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="m18.038 10.663-5.625 5.625a.94.94 0 0 1-1.328-1.328l4.024-4.023H3.625a.938.938 0 0 1 0-1.875h11.484l-4.022-4.025a.94.94 0 0 1 1.328-1.328l5.625 5.625a.935.935 0 0 1-.002 1.33" fill="#fff"/>
                    </svg>
                </button>
            </div>
        </form>
        </div>
        <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap');
                    *{ font-family: "Geist", sans-serif; }
                `}
            </style>
    
            <section className='bg-black w-full flex flex-col items-center justify-center py-20 px-4'>
                <div className='w-full max-w-5xl'>
                    <div className='mb-12'>
                        <h2 className='text-5xl font-medium text-neutral-50 text-center'>FAQ&apos;s</h2>
                        <p className='text-neutral-100 max-w-[540px] text-base/6 text-center mx-auto mt-5'>Find answers to the most frequently asked questions about our platform, features, pricing and how we help businesses grow faster.</p>
                    </div>

                    <input id="faq-none" name="faq-accordion" type="radio" className="hidden" defaultChecked />

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-y-0'>
                        {columns.map((column, columnIndex) => (
                            <div key={columnIndex} className='space-y-4'>
                                {column.map((faq) => (
                                    <details key={faq.question} name="faq-accordion" className='group rounded-lg border border-neutral-800 bg-neutral-950 transition-all duration-300 hover:bg-neutral-900'>
                                        <summary className='flex cursor-pointer list-none items-center justify-between gap-4 p-3.5 [&::-webkit-details-marker]:hidden'>
                                            <span className='text-sm font-medium text-neutral-100'>{faq.question}</span>
                                            <div className='shrink-0 rounded p-1 text-neutral-100 transition-colors hover:bg-neutral-800'>
                                                <svg className='block group-open:hidden' xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                                <svg className='hidden group-open:block' xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                                            </div>
                                        </summary>
                                        <div className='grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-in-out group-open:grid-rows-[1fr] group-open:opacity-100'>
                                            <div className='overflow-hidden'>
                                                <p className='px-3.5 pb-3.5 text-sm leading-relaxed text-neutral-300'>
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <footer style={{ borderTop: "1px solid #E8EEFF", padding: "28px 24px", textAlign: "center", fontSize: 13.5, color: "#94A3B8" }}>
      © {new Date().getFullYear()} GRC Platform. All rights reserved.
    </footer>

        </>
    );
};