import React, { useState, useEffect } from 'react';

/**
 * Emmet LSP JSX Demo Component
 * Try typing these abbreviations and watch the real-time tracking:
 */

const EmmetDemoComponent = () => {
    const [count, setCount] = useState(0);
    const [items, setItems] = useState([]);

    useEffect(() => {
        // Try: div.loading>span.spinner+p.loading-text
        console.log('Component mounted');
    }, []);

    return (
        <div className="emmet-demo">
            {/* Try: header.demo-header>h1.title+nav.navigation>ul>li*4>a[href="#"] */}
            <header className="demo-header">
                <h1 className="title">Emmet LSP JSX Demo</h1>
                <nav className="navigation">
                    <ul>
                        <li><a href="#">Home</a></li>
                        <li><a href="#">About</a></li>
                        <li><a href="#">Services</a></li>
                        <li><a href="#">Contact</a></li>
                    </ul>
                </nav>
            </header>

            {/* Try: main.content>section.hero+section.features+section.testimonials */}
            <main className="content">
                {/* Hero Section */}
                {/* Try: section.hero>div.container>h2.hero-title+p.hero-subtitle+button.cta-button */}
                <section className="hero">
                    <div className="container">
                        <h2 className="hero-title">Real-time Emmet Tracking</h2>
                        <p className="hero-subtitle">Experience abbreviations as you type</p>
                        <button className="cta-button" onClick={() => setCount(count + 1)}>
                            Click me ({count})
                        </button>
                    </div>
                </section>

                {/* Features Grid */}
                {/* Try: section.features>div.container>h2.section-title+div.features-grid>div.feature-card*6 */}
                <section className="features">
                    <div className="container">
                        <h2 className="section-title">Features</h2>
                        <div className="features-grid">
                            {/* Try: div.feature-card>div.feature-icon+h3.feature-title+p.feature-description */}
                            <div className="feature-card">
                                <div className="feature-icon">🚀</div>
                                <h3 className="feature-title">Real-time Tracking</h3>
                                <p className="feature-description">Track abbreviations on every keystroke</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">💡</div>
                                <h3 className="feature-title">Live Preview</h3>
                                <p className="feature-description">See expansions before you commit</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">⚡</div>
                                <h3 className="feature-title">Context Aware</h3>
                                <p className="feature-description">Smart suggestions based on context</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">🎯</div>
                                <h3 className="feature-title">Multi-language</h3>
                                <p className="feature-description">HTML, CSS, JSX, and more</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">⚙️</div>
                                <h3 className="feature-title">Configurable</h3>
                                <p className="feature-description">Customize to your workflow</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">🔧</div>
                                <h3 className="feature-title">LSP Compatible</h3>
                                <p className="feature-description">Works with any LSP-enabled editor</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Interactive Demo Section */}
                {/* Try: section.demo>div.container>h2+div.demo-area */}
                <section className="demo">
                    <div className="container">
                        <h2>Try These Abbreviations</h2>
                        <div className="demo-area">
                            {/* Try: div.demo-box>h3+ul>li*5 */}
                            <div className="demo-box">
                                <h3>Basic HTML Structures</h3>
                                <ul>
                                    <li>div.container → &lt;div className="container"&gt;&lt;/div&gt;</li>
                                    <li>ul>li*3>a → Unordered list with 3 items</li>
                                    <li>table>tr*2>td*3 → 2x3 table structure</li>
                                    <li>form>input:text+input:email+button:submit</li>
                                    <li>nav>ul.menu>li.menu-item*4>a.menu-link</li>
                                </ul>
                            </div>

                            {/* Try: div.demo-box>h3+div.code-examples */}
                            <div className="demo-box">
                                <h3>JSX Specific</h3>
                                <div className="code-examples">
                                    {/* Try: div.example>code+div.result */}
                                    <div className="example">
                                        <code>div.card>img[src alt]+div.card-body>h4.card-title+p.card-text+button.btn</code>
                                        <div className="result">
                                            <div className="card">
                                                <img src="" alt="" />
                                                <div className="card-body">
                                                    <h4 className="card-title"></h4>
                                                    <p className="card-text"></p>
                                                    <button className="btn"></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Form Example */}
                {/* Try: section.contact>div.container>h2+form.contact-form */}
                <section className="contact">
                    <div className="container">
                        <h2>Contact Form Demo</h2>
                        {/* Try: form.contact-form>fieldset>legend+div.form-group*4 */}
                        <form className="contact-form">
                            <fieldset>
                                <legend>Get in Touch</legend>
                                {/* Try: div.form-group>label[for]+input[type id name required] */}
                                <div className="form-group">
                                    <label htmlFor="fullname">Full Name</label>
                                    <input type="text" id="fullname" name="fullname" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email Address</label>
                                    <input type="email" id="email" name="email" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="subject">Subject</label>
                                    <input type="text" id="subject" name="subject" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="message">Message</label>
                                    <textarea id="message" name="message" rows="4" required></textarea>
                                </div>
                                {/* Try: div.form-actions>button:submit+button:reset */}
                                <div className="form-actions">
                                    <button type="submit">Send Message</button>
                                    <button type="reset">Reset Form</button>
                                </div>
                            </fieldset>
                        </form>
                    </div>
                </section>

                {/* Dynamic Content Example */}
                {/* Try: section.dynamic>div.container>h2+div.dynamic-content */}
                <section className="dynamic">
                    <div className="container">
                        <h2>Dynamic Content</h2>
                        <div className="dynamic-content">
                            {/* Conditional rendering - Try: div.conditional>{items.length>0?div.items-list:div.empty-state} */}
                            {items.length > 0 ? (
                                <div className="items-list">
                                    {/* Try: div.item*${items.length} */}
                                    {items.map((item, index) => (
                                        <div key={index} className="item">
                                            <span className="item-text">{item}</span>
                                            <button 
                                                className="remove-btn"
                                                onClick={() => setItems(items.filter((_, i) => i !== index))}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Try: div.empty-state>div.empty-icon+h3.empty-title+p.empty-message+button.add-item-btn */
                                <div className="empty-state">
                                    <div className="empty-icon">📝</div>
                                    <h3 className="empty-title">No items yet</h3>
                                    <p className="empty-message">Add some items to see them here</p>
                                    <button 
                                        className="add-item-btn"
                                        onClick={() => setItems([...items, `Item ${items.length + 1}`])}
                                    >
                                        Add Item
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Try: footer.demo-footer>div.container>div.footer-content */}
            <footer className="demo-footer">
                <div className="container">
                    <div className="footer-content">
                        {/* Try: div.footer-section*3 */}
                        <div className="footer-section">
                            <h4>Emmet LSP</h4>
                            <p>Real-time abbreviation tracking for modern editors</p>
                        </div>
                        <div className="footer-section">
                            <h4>Features</h4>
                            {/* Try: ul>li*4 */}
                            <ul>
                                <li>Real-time tracking</li>
                                <li>Multi-language support</li>
                                <li>Context awareness</li>
                                <li>LSP compatibility</li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Links</h4>
                            {/* Try: ul>li>a[href]*4 */}
                            <ul>
                                <li><a href="https://emmet.io">Emmet.io</a></li>
                                <li><a href="https://zed.dev">Zed Editor</a></li>
                                <li><a href="https://github.com/emmetio/emmet">GitHub</a></li>
                                <li><a href="https://docs.emmet.io">Documentation</a></li>
                            </ul>
                        </div>
                    </div>
                    {/* Try: div.footer-bottom>p.copyright */}
                    <div className="footer-bottom">
                        <p className="copyright">
                            © 2024 Emmet LSP. Built with ❤️ for developers.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Additional component examples for testing
/* Try: const+LoadingSpinner+()=>div.spinner>div.spinner-circle*3 */
const LoadingSpinner = () => (
    <div className="spinner">
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
    </div>
);

/* Try: const+Modal+({+children,+isOpen,+onClose+})=> */
const Modal = ({ children, isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
        /* Try: div.modal-overlay>div.modal-content>button.modal-close+div.modal-body */
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

/* Try: const+Button+({+variant='primary',+size='medium',+children,+...props+})=> */
const Button = ({ variant = 'primary', size = 'medium', children, ...props }) => (
    <button 
        className={`btn btn-${variant} btn-${size}`}
        {...props}
    >
        {children}
    </button>
);

export default EmmetDemoComponent;
export { LoadingSpinner, Modal, Button };