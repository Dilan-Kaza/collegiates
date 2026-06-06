"use client";
import { UserLayout } from "@/app/layouts/user";
import { NavBar } from "@/app/components/navbar";
import { ImgHeader } from "@/app/layouts/headers";
import { formatTimeAgo } from "@/app/utils/dateFormatter";
import { useState, useEffect } from "react";

export default function News() {
  // let data = await fetch("");
  // let posts = await data.json();
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0); // To handle total number of pages

  useEffect(() => {
    fetch(`http://localhost:8000/collegiates_app/blog_data/?page=${page}`, {
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((json) => setData(json));
  }, [page]);

  function handleNext() {
    if (data.has_next) {
      setPage(page + 1);
      window.scrollTo({ top: 0 });
    }
  }

  function handlePrev() {
    if (data.has_previous) {
      setPage(page - 1);
      window.scrollTo({ top: 0 });
    }
  }

  // sort most recent date
  // posts.sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted));

  return (
    <UserLayout navBar={<NavBar/>} header={<ImgHeader/>}>
      <div className="flex items-center justify-center text-off-white py-4 gap-4">
        <button
          type="button"
          onClick={() => handlePrev()}
          className="bg-primary p-4 rounded-full cursor-pointer"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => handleNext()}
          className="bg-primary p-4 rounded-full cursor-pointer"
        >
          Next
        </button>
      </div>
      <ul className="flex flex-col gap-4 bg-white p-4 rounded-lg divide-y divide-slate-200">
        {/* {JSON.stringify(data.posts)} */}
        {data.posts?.map((post) => {
          const formattedContent = post.post_content
            ? post.post_content.replace(/(?:\r\n|\r|\n)/g, "<br />")
            : "";

          return (
            <div key={post.post_id} className="flex flex-col gap-1">
              <div className="mb-2">
                <li className="font-bold text-slate-600">{post?.author}</li>
                <li className="text-3xl">{post.title}</li>
                <li>{post.category}</li>
                <li className="text-sm text-slate-500">
                  {formatTimeAgo(post.date_posted)}
                </li>
              </div>
              <li
                className="p-4 rounded-lg"
                dangerouslySetInnerHTML={{
                  __html: formattedContent,
                }}
              />
              <div className="mb-4"></div>
            </div>
          );
        })}
      </ul>
      <div className="flex items-center justify-center text-off-white py-4 gap-4">
        <button
          type="button"
          onClick={() => handlePrev()}
          className="bg-primary p-4 rounded-full cursor-pointer"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => handleNext()}
          className="bg-primary p-4 rounded-full cursor-pointer"
        >
          Next
        </button>
      </div>
    </UserLayout>
  );
}
