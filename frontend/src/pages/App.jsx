import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const socket = io(BACKEND, { autoConnect: false });

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  async function submit(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${BACKEND}/api/auth/login`, { email, password: pw });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      onLogin(user);
    } catch (err) {
      alert("Login failed: " + (err?.response?.data?.error || err.message));
    }
  }
  return (
    <form onSubmit={submit} className="p-6 max-w-md mx-auto mt-8 bg-white shadow rounded">
      <h2 className="text-lg font-semibold mb-4">Sign in</h2>
      <input className="input" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" placeholder="password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button className="btn-primary mt-2">Sign in</button>
      <p className="text-xs mt-2">Use a registered user or call /api/auth/register</p>
    </form>
  );
}

function LiveFeed({ token, deptId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!token || !deptId) return;
    socket.auth = { token };
    socket.connect();
    socket.emit("join", `department:${deptId}`);

    const handler = (data) => {
      setItems((s) => [data, ...s].slice(0, 100));
    };

    socket.on("activity:created", handler);

    // initial load
    (async () => {
      const res = await axios.get(`${BACKEND}/api/activities?departmentId=${deptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    })();

    return () => {
      socket.off("activity:created", handler);
      socket.emit("leave", `department:${deptId}`);
      socket.disconnect();
    };
  }, [token, deptId]);

  return (
    <div className="grid gap-3">
      {items.map((a) => (
        <div key={a._id} className="p-3 bg-white shadow rounded">
          <div className="text-sm text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
          <div className="font-medium">{a.activityType} — <span className="text-xs text-gray-500">{a.status}</span></div>
          <pre className="mt-2 text-xs">{JSON.stringify(a.details, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [deptId, setDeptId] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token && !user) {
      // try fetch me by hitting activities (simple)
      (async () => {
        try {
          // no profile endpoint in the demo; we just set a dummy user
          const header = { Authorization: `Bearer ${token}` };
          // try to fetch departments to pick first
          const dres = await axios.get(`${BACKEND}/api/departments`, { headers: header });
          if (dres.data?.length) setDeptId(dres.data[0]._id);
          setUser({ name: "operator" });
        } catch (err) {
          console.log("token invalid", err);
          localStorage.removeItem("token");
        }
      })();
    }
  }, []);

  if (!token || !user) return <Login onLogin={(u) => { setUser(u); }} />;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">PharmaTrack — Dashboard</h1>
          <div>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="input">
              {/* we'll fetch and populate */}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-3 gap-6">
        <section className="col-span-2">
          <h2 className="text-lg font-semibold mb-4">Live Feed</h2>
          <LiveFeed token={token} deptId={deptId} />
        </section>

        <aside>
          <div className="p-4 bg-white shadow rounded">
            <h3 className="font-medium mb-2">Quick Actions</h3>
            <CreateDemoActivity deptId={deptId} token={token} />
          </div>
        </aside>
      </main>
    </div>
  );
}

function CreateDemoActivity({ deptId, token }) {
  const [activityType, setActivityType] = useState("EQUIP_ON");
  const [details, setDetails] = useState("{}");

  async function submit(e) {
    e.preventDefault();
    if (!deptId) return alert("select department first (see backend /departments)");
    try {
      const res = await axios.post(`${BACKEND}/api/activities`, {
        departmentId: deptId,
        activityType,
        details: JSON.parse(details)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("created " + res.data._id);
      setDetails("{}");
    } catch (err) {
      alert("error: " + (err?.response?.data?.error || err.message));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-sm">Type</label>
      <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="input">
        <option value="EQUIP_ON">Equipment On</option>
        <option value="CLEANING">Cleaning</option>
        <option value="MEDIA_PREP">Media Prep</option>
      </select>
      <label className="block text-sm">Details (JSON)</label>
      <textarea className="input h-24" value={details} onChange={(e) => setDetails(e.target.value)} />
      <button className="btn-primary">Create</button>
    </form>
  );
}
