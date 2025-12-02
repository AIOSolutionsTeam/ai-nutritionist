import Navigation from "../../components/Navigation";

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#FEFDFB]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-[#F5C842]/10 via-white to-[#FEFDFB]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center animate-fadeInUp">
          <span className="subheading text-[#6B6B6B] block mb-4">Get in Touch</span>
          <h1 className="headline text-5xl lg:text-6xl font-light text-[#1A1A1A] mb-8">
            Contact Us
          </h1>
          <p className="text-xl text-[#6B6B6B] font-light leading-relaxed max-w-2xl mx-auto">
            Have questions about our AI nutritionist platform? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="section-padding bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Information */}
            <div className="animate-fadeInUp">
              <h2 className="headline text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-8">
                Contact Information
              </h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="subheading text-[#6B6B6B] mb-2">Email</h3>
                  <p className="text-lg text-[#1A1A1A] font-light">support@ai-nutritionist.com</p>
                </div>
                
                <div>
                  <h3 className="subheading text-[#6B6B6B] mb-2">Phone</h3>
                  <p className="text-lg text-[#1A1A1A] font-light">+1 (555) 123-4567</p>
                </div>
                
                <div>
                  <h3 className="subheading text-[#6B6B6B] mb-2">Business Hours</h3>
                  <p className="text-lg text-[#1A1A1A] font-light">
                    Monday - Friday: 9:00 AM - 6:00 PM EST
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="premium-card p-10 lg:p-12 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              <h2 className="headline text-3xl font-light text-[#1A1A1A] mb-8">
                Send us a Message
              </h2>
              
              <form className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block subheading text-[#6B6B6B] mb-2"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-3 border border-[#6B6B6B]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-transparent bg-white text-[#1A1A1A] font-light transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label
                    htmlFor="email"
                    className="block subheading text-[#6B6B6B] mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 border border-[#6B6B6B]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-transparent bg-white text-[#1A1A1A] font-light transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label
                    htmlFor="subject"
                    className="block subheading text-[#6B6B6B] mb-2"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="w-full px-4 py-3 border border-[#6B6B6B]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-transparent bg-white text-[#1A1A1A] font-light transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label
                    htmlFor="message"
                    className="block subheading text-[#6B6B6B] mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    className="w-full px-4 py-3 border border-[#6B6B6B]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-transparent bg-white text-[#1A1A1A] font-light transition-all resize-none"
                    required
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className="btn-outline w-full hover:bg-[#1A1A1A] hover:text-white"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
