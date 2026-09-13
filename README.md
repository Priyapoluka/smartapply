\# SmartApply – Job Application Tracker



SmartApply is a full-stack web application that helps users manage and track their job applications in one place.



\## Features



\- User registration and login

\- Secure password hashing using bcrypt

\- JWT-based authentication

\- Add job applications

\- Edit existing applications

\- Delete applications

\- Track application status

\- Filter applications by status

\- Dashboard with application statistics

\- Notes and job application details

\- Responsive and clean user interface



\## Tech Stack



\### Frontend

\- React.js

\- Vite

\- CSS



\### Backend

\- Node.js

\- Express.js

\- REST API



\### Database

\- SQLite

\- better-sqlite3



\### Authentication \& Security

\- bcryptjs

\- JSON Web Tokens (JWT)

\- Protected API routes

\- User ownership checks

\- Basic input validation



\## Application Architecture



```text

React Frontend

&#x20;     |

&#x20;     | REST API

&#x20;     v

Express.js Backend

&#x20;     |

&#x20;     v

SQLite Database

