import { useEffect, useState } from "react";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return (
      <Auth
        setToken={setToken}
        setUser={setUser}
      />
    );
  }

  return user.role === "buyer" ? (
    <BuyerDashboard token={token} user={user} logout={logout} />
  ) : (
    <SupplierDashboard token={token} user={user} logout={logout} />
  );
}

/* ================= AUTH ================= */

function Auth({ setToken, setUser }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer"
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = register
        ? "/auth/register"
        : "/auth/login";

      const body = register
        ? form
        : {
            email: form.email,
            password: form.password
          };

      const response = await fetch(API + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      if (register) {
        setMessage("Account created successfully. Please login.");
        setRegister(false);
        setForm({
          ...form,
          password: ""
        });
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-icon">RF</div>

        <h1>RFQ Marketplace</h1>

        <p className="subtitle">
          Connect buyers and suppliers through smarter quotations.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={!register ? "active-tab" : ""}
            onClick={() => {
              setRegister(false);
              setMessage("");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={register ? "active-tab" : ""}
            onClick={() => {
              setRegister(true);
              setMessage("");
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit}>
          {register && (
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value
                })
              }
              required
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value
              })
            }
            required
          />

          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value
              })
            }
            minLength={6}
            required
          />

          {register && (
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value
                })
              }
            >
              <option value="buyer">Buyer</option>
              <option value="supplier">Supplier</option>
            </select>
          )}

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <button className="primary-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : register
              ? "Create Account"
              : "Login"}
          </button>
        </form>

        <p className="switch-text">
          {register
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <span
            onClick={() => {
              setRegister(!register);
              setMessage("");
            }}
          >
            {register ? "Login" : "Register"}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ================= BUYER ================= */

function BuyerDashboard({ token, user, logout }) {
  const [rfqs, setRfqs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [message, setMessage] = useState("");

  const emptyForm = {
    product_name: "",
    description: "",
    quantity: "",
    delivery_location: "",
    deadline: ""
  };

  const [form, setForm] = useState(emptyForm);

  const fetchRfqs = async () => {
    const response = await fetch(`${API}/my-rfqs`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      setRfqs(data);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, []);

  const saveRfq = async (e) => {
    e.preventDefault();
    setMessage("");

    const url = editingId
      ? `${API}/rfqs/${editingId}`
      : `${API}/rfqs`;

    const response = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message);
      return;
    }

    setMessage(
      editingId
        ? "RFQ updated successfully."
        : "RFQ created successfully."
    );

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    fetchRfqs();
  };

  const editRfq = (rfq) => {
    setForm({
      product_name: rfq.product_name,
      description: rfq.description,
      quantity: rfq.quantity,
      delivery_location: rfq.delivery_location,
      deadline: rfq.deadline
    });

    setEditingId(rfq.id);
    setShowForm(true);
  };

  const deleteRfq = async (id) => {
    if (!window.confirm("Delete this RFQ?")) return;

    const response = await fetch(`${API}/rfqs/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      setMessage("RFQ deleted successfully.");
      fetchRfqs();
    } else {
      setMessage(data.message);
    }
  };

  const viewQuotations = async (id) => {
    const response = await fetch(`${API}/rfqs/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      setSelectedRfq(data);
    }
  };

  return (
    <div className="dashboard">
      <Header
        user={user}
        role="Buyer"
        logout={logout}
      />

      <main>
        <div className="hero-section">
          <div>
            <p className="eyebrow">BUYER PORTAL</p>
            <h2>Manage your RFQs</h2>
            <p>
              Post business requirements and compare supplier quotations.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setForm(emptyForm);
              setMessage("");
            }}
          >
            {showForm ? "Close" : "+ Create RFQ"}
          </button>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {showForm && (
          <form className="panel" onSubmit={saveRfq}>
            <h3>
              {editingId ? "Edit RFQ" : "Create New RFQ"}
            </h3>

            <div className="form-grid">
              <input
                placeholder="Product / Service name *"
                value={form.product_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    product_name: e.target.value
                  })
                }
                required
              />

              <input
                placeholder="Quantity *"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: e.target.value
                  })
                }
                required
              />

              <input
                placeholder="Delivery location *"
                value={form.delivery_location}
                onChange={(e) =>
                  setForm({
                    ...form,
                    delivery_location: e.target.value
                  })
                }
                required
              />

              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deadline: e.target.value
                  })
                }
                required
              />
            </div>

            <textarea
              placeholder="Requirement description *"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value
                })
              }
              rows="4"
              required
            />

            <div className="form-actions">
              <button className="primary-btn">
                {editingId ? "Update RFQ" : "Publish RFQ"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="panel">
          <div className="section-title">
            <div>
              <h2>My RFQs</h2>
              <p>{rfqs.length} requirement(s) posted</p>
            </div>
          </div>

          {rfqs.length === 0 ? (
            <EmptyState text="You haven't posted any RFQs yet." />
          ) : (
            <div className="rfq-list">
              {rfqs.map((rfq) => (
                <div className="rfq-card" key={rfq.id}>
                  <div className="rfq-main">
                    <div className="badge buyer-badge">
                      RFQ #{rfq.id}
                    </div>

                    <h3>{rfq.product_name}</h3>

                    <p>{rfq.description}</p>

                    <div className="rfq-meta">
                      <span>📦 {rfq.quantity}</span>
                      <span>📍 {rfq.delivery_location}</span>
                      <span>⏰ Deadline: {rfq.deadline}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="secondary-btn"
                      onClick={() => viewQuotations(rfq.id)}
                    >
                      Quotations
                    </button>

                    <button
                      className="edit-btn"
                      onClick={() => editRfq(rfq)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deleteRfq(rfq.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedRfq && (
          <QuotationPanel
            data={selectedRfq}
            close={() => setSelectedRfq(null)}
          />
        )}
      </main>
    </div>
  );
}

/* ================= SUPPLIER ================= */

function SupplierDashboard({ token, user, logout }) {
  const [rfqs, setRfqs] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [showQuote, setShowQuote] = useState(false);
  const [quote, setQuote] = useState({
    quoted_price: "",
    delivery_time: "",
    message: ""
  });
  const [message, setMessage] = useState("");

  const fetchRfqs = async (term = "") => {
    const response = await fetch(
      `${API}/rfqs?search=${encodeURIComponent(term)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      setRfqs(data);
    }
  };

  const fetchQuotations = async () => {
    const response = await fetch(`${API}/my-quotations`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      setQuotations(data);
    }
  };

  useEffect(() => {
    fetchRfqs();
    fetchQuotations();
  }, []);

  const openRfq = async (id) => {
    const response = await fetch(`${API}/rfqs/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      setSelectedRfq(data.rfq);
      setShowQuote(false);
      setMessage("");
    }
  };

  const submitQuote = async (e) => {
    e.preventDefault();
    setMessage("");

    const response = await fetch(
      `${API}/rfqs/${selectedRfq.id}/quotations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(quote)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message);
      return;
    }

    setMessage("Quotation submitted successfully.");
    setQuote({
      quoted_price: "",
      delivery_time: "",
      message: ""
    });
    setShowQuote(false);
    fetchQuotations();
  };

  return (
    <div className="dashboard">
      <Header
        user={user}
        role="Supplier"
        logout={logout}
      />

      <main>
        <div className="hero-section">
          <div>
            <p className="eyebrow">SUPPLIER PORTAL</p>
            <h2>Find business opportunities</h2>
            <p>
              Discover RFQs and submit competitive quotations.
            </p>
          </div>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        <section className="panel">
          <div className="section-title">
            <div>
              <h2>Available RFQs</h2>
              <p>Browse requirements posted by buyers.</p>
            </div>

            <div className="search-box">
              <input
                placeholder="Search RFQs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchRfqs(e.target.value);
                }}
              />
            </div>
          </div>

          {rfqs.length === 0 ? (
            <EmptyState text="No RFQs found." />
          ) : (
            <div className="rfq-list">
              {rfqs.map((rfq) => (
                <div className="rfq-card" key={rfq.id}>
                  <div className="rfq-main">
                    <div className="badge supplier-badge">
                      OPEN RFQ
                    </div>

                    <h3>{rfq.product_name}</h3>

                    <p>{rfq.description}</p>

                    <div className="rfq-meta">
                      <span>📦 {rfq.quantity}</span>
                      <span>📍 {rfq.delivery_location}</span>
                      <span>⏰ {rfq.deadline}</span>
                    </div>

                    <small>
                      Posted by {rfq.buyer_name}
                    </small>
                  </div>

                  <button
                    className="primary-btn"
                    onClick={() => openRfq(rfq.id)}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-title">
            <div>
              <h2>My Quotations</h2>
              <p>Track quotations you've submitted.</p>
            </div>
          </div>

          {quotations.length === 0 ? (
            <EmptyState text="You haven't submitted any quotations yet." />
          ) : (
            <div className="quote-list">
              {quotations.map((item) => (
                <div className="quote-card" key={item.id}>
                  <div>
                    <h3>{item.product_name}</h3>
                    <p>{item.message || "No additional message."}</p>
                  </div>

                  <div className="quote-info">
                    <strong>₹{item.quoted_price}</strong>
                    <span>{item.delivery_time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedRfq && (
          <div className="modal-backdrop">
            <div className="modal">
              <button
                className="modal-close"
                onClick={() => setSelectedRfq(null)}
              >
                ×
              </button>

              <div className="badge supplier-badge">
                RFQ DETAILS
              </div>

              <h2>{selectedRfq.product_name}</h2>

              <p>{selectedRfq.description}</p>

              <div className="detail-grid">
                <div>
                  <strong>Quantity</strong>
                  <span>{selectedRfq.quantity}</span>
                </div>

                <div>
                  <strong>Location</strong>
                  <span>{selectedRfq.delivery_location}</span>
                </div>

                <div>
                  <strong>Deadline</strong>
                  <span>{selectedRfq.deadline}</span>
                </div>

                <div>
                  <strong>Buyer</strong>
                  <span>{selectedRfq.buyer_name}</span>
                </div>
              </div>

              {!showQuote ? (
                <button
                  className="primary-btn full-width"
                  onClick={() => setShowQuote(true)}
                >
                  Submit Quotation
                </button>
              ) : (
                <form onSubmit={submitQuote}>
                  <h3>Submit Your Quotation</h3>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Quoted price (₹) *"
                    value={quote.quoted_price}
                    onChange={(e) =>
                      setQuote({
                        ...quote,
                        quoted_price: e.target.value
                      })
                    }
                    required
                  />

                  <input
                    placeholder="Estimated delivery time *"
                    value={quote.delivery_time}
                    onChange={(e) =>
                      setQuote({
                        ...quote,
                        delivery_time: e.target.value
                      })
                    }
                    required
                  />

                  <textarea
                    placeholder="Message / notes"
                    rows="4"
                    value={quote.message}
                    onChange={(e) =>
                      setQuote({
                        ...quote,
                        message: e.target.value
                      })
                    }
                  />

                  <button className="primary-btn full-width">
                    Submit Quote
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Header({ user, role, logout }) {
  return (
    <header className="app-header">
      <div>
        <div className="header-brand">
          <span>RF</span>
          <h1>RFQ Marketplace</h1>
        </div>

        <p>
          Welcome, {user.name} · <strong>{role}</strong>
        </p>
      </div>

      <button className="logout-btn" onClick={logout}>
        Logout
      </button>
    </header>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📋</div>
      <h3>{text}</h3>
      <p>Check back later for new activity.</p>
    </div>
  );
}

function QuotationPanel({ data, close }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button
          className="modal-close"
          onClick={close}
        >
          ×
        </button>

        <div className="badge buyer-badge">
          QUOTATIONS
        </div>

        <h2>{data.rfq.product_name}</h2>

        {data.quotations.length === 0 ? (
          <EmptyState text="No quotations received yet." />
        ) : (
          <div className="quote-list">
            {data.quotations.map((quote) => (
              <div className="quote-card" key={quote.id}>
                <div>
                  <h3>{quote.supplier_name}</h3>
                  <p>{quote.message || "No message."}</p>
                  <small>{quote.supplier_email}</small>
                </div>

                <div className="quote-info">
                  <strong>₹{quote.quoted_price}</strong>
                  <span>{quote.delivery_time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;