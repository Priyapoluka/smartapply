import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [isRegister, setIsRegister] = useState(false);

  if (!token) {
    return (
      <Auth
        isRegister={isRegister}
        setIsRegister={setIsRegister}
        setToken={setToken}
        setUser={setUser}
      />
    );
  }

  return (
    <Dashboard
      token={token}
      user={user}
      logout={() => {
        localStorage.clear();
        setToken(null);
        setUser(null);
      }}
    />
  );
}

function Auth({ isRegister, setIsRegister, setToken, setUser }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";

      const response = await fetch(API + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      if (isRegister) {
        setIsRegister(false);
        setError("Registration successful! Please login.");
        setForm({
          name: "",
          email: form.email,
          password: "",
        });
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">S</div>
        <h1>SmartApply</h1>
        <p className="subtitle">Your simple job application tracker</p>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            required
            minLength={6}
          />

          {error && <div className="message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isRegister
              ? "Create Account"
              : "Login"}
          </button>
        </form>

        <p className="switch">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Login" : "Register"}
          </span>
        </p>
      </div>
    </div>
  );
}

function Dashboard({ token, user, logout }) {
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("All");

  const emptyForm = {
    company: "",
    job_title: "",
    job_url: "",
    status: "Applied",
    applied_date: "",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  const fetchApplications = async () => {
    const response = await fetch(`${API}/applications`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      setApplications(data);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const saveApplication = async (e) => {
    e.preventDefault();

    const url = editingId
      ? `${API}/applications/${editingId}`
      : `${API}/applications`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      fetchApplications();
    }
  };

  const startEdit = (app) => {
    setForm({
      company: app.company,
      job_title: app.job_title,
      job_url: app.job_url || "",
      status: app.status,
      applied_date: app.applied_date || "",
      notes: app.notes || "",
    });

    setEditingId(app.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const deleteApplication = async (id) => {
    if (!window.confirm("Delete this application?")) return;

    await fetch(`${API}/applications/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchApplications();
  };

  const filteredApplications =
    filter === "All"
      ? applications
      : applications.filter((app) => app.status === filter);

  const count = (status) =>
    applications.filter((app) => app.status === status).length;

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>SmartApply</h1>
          <p>Welcome back, {user?.name || "there"} 👋</p>
        </div>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </header>

      <main>
        <div className="top-section">
          <div>
            <h2>Application Dashboard</h2>
            <p>Track your job search in one place.</p>
          </div>

          <button
            className="add-btn"
            onClick={() => {
              if (showForm) {
                cancelForm();
              } else {
                setForm(emptyForm);
                setEditingId(null);
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Close" : "+ Add Application"}
          </button>
        </div>

        <div className="stats">
          <Stat title="Total" value={applications.length} />
          <Stat title="Applied" value={count("Applied")} />
          <Stat title="Interviews" value={count("Interview")} />
          <Stat title="Selected" value={count("Selected")} />
          <Stat title="Rejected" value={count("Rejected")} />
        </div>

        {showForm && (
          <form className="application-form" onSubmit={saveApplication}>
            <h3>
              {editingId ? "Edit Application" : "Add Job Application"}
            </h3>

            <div className="form-grid">
              <input
                placeholder="Company *"
                value={form.company}
                onChange={(e) =>
                  setForm({ ...form, company: e.target.value })
                }
                required
              />

              <input
                placeholder="Job title *"
                value={form.job_title}
                onChange={(e) =>
                  setForm({ ...form, job_title: e.target.value })
                }
                required
              />

              <input
                placeholder="Job URL"
                value={form.job_url}
                onChange={(e) =>
                  setForm({ ...form, job_url: e.target.value })
                }
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                <option>Applied</option>
                <option>Interview</option>
                <option>Selected</option>
                <option>Rejected</option>
              </select>

              <input
                type="date"
                value={form.applied_date}
                onChange={(e) =>
                  setForm({ ...form, applied_date: e.target.value })
                }
              />

              <input
                placeholder="Notes"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
              />
            </div>

            <div className="form-actions">
              <button type="submit">
                {editingId ? "Update Application" : "Save Application"}
              </button>

              <button
                type="button"
                className="cancel"
                onClick={cancelForm}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="applications-section">
          <div className="section-header">
            <h2>My Applications</h2>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>Applied</option>
              <option>Interview</option>
              <option>Selected</option>
              <option>Rejected</option>
            </select>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="empty">
              <div>📋</div>
              <h3>No applications yet</h3>
              <p>
                Click "Add Application" to start tracking your job search.
              </p>
            </div>
          ) : (
            <div className="application-list">
              {filteredApplications.map((app) => (
                <div className="application-card" key={app.id}>
                  <div>
                    <h3>{app.job_title}</h3>
                    <p className="company">{app.company}</p>

                    {app.applied_date && (
                      <p className="date">
                        Applied: {app.applied_date}
                      </p>
                    )}

                    {app.notes && (
                      <p className="notes">{app.notes}</p>
                    )}

                    {app.job_url && (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Job →
                      </a>
                    )}
                  </div>

                  <div className="card-right">
                    <span
                      className={`status ${app.status.toLowerCase()}`}
                    >
                      {app.status}
                    </span>

                    <div className="card-buttons">
                      <button
                        className="edit"
                        onClick={() => startEdit(app)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete"
                        onClick={() => deleteApplication(app.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="stat-card">
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

export default App;