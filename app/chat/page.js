"use client";
import { useState, useEffect, useContext, useRef } from 'react';
import { continueChat } from '../api/chat';
import { startSession } from '../api/startSession';
import { getProductDetails } from '../api/productDetails';
import { SessionContext } from '../context/SessionContext';
import { useAuth } from '@clerk/nextjs';
import { COLORS } from '../utils/config';
import ProductCard from '../components/ProductCard';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [currentTopic, setCurrentTopic] = useState('');
    const [isChatActive, setIsChatActive] = useState(true);
    const [backgroundStyle, setBackgroundStyle] = useState({
        backgroundImage: `url("/bgs/default.jpg")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    });
    const [products, setProducts] = useState([]); // New state to store product details
    const { chatSessionId, setChatSessionId } = useContext(SessionContext);
    const { isLoaded, userId, sessionId, getToken } = useAuth();
    const messageEndRef = useRef(null);

    useEffect(() => {
        const newChatSessionId = Math.random().toString(36).substr(2, 9);
        setChatSessionId(newChatSessionId);
    }, []);

    useEffect(() => {
        const backgroundImage = currentTopic ? `/bgs/${currentTopic}.jpg` : '/bgs/default.jpg';
        setBackgroundStyle({
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        });
    }, [currentTopic]);

    useEffect(() => {
        handleStartSession();
    }, [chatSessionId, userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleStartSession = async () => {
        if (chatSessionId) {
            try {
                await startSession(userId, chatSessionId);
                addMessage(`Your session ID is ${chatSessionId}`, "user");
                addMessage("Session started. How can I assist you today?", "bot");
            } catch (error) {
                console.error('Failed to start session:', error);
            }
        }
    };

    const addMessage = (text, sender) => {
        setMessages(prev => [...prev, { text, sender }]);
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        addMessage(input, "user");

        try {
            const { cur_state, text_content, product_list } = await continueChat(userId, chatSessionId, input);

            if (cur_state === "completed") {
                setIsChatActive(false);
                addMessage("Chat ended. " + text_content, "bot");
            } else {
                setCurrentTopic(cur_state);
                addMessage(text_content, "bot");

                // Fetch product details
                if (product_list && product_list.length > 0) {
                    const productDetailsPromises = product_list.map(productId => getProductDetails(productId));
                    const productsData = await Promise.all(productDetailsPromises);
                    setProducts(productsData); // Store product details in state
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }

        setInput(''); // Ensure input is cleared after sending
    };

    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div 
            className={`min-h-screen w-full flex flex-col ${COLORS.RAKUTEN_ROSE_BG}`}
        >
            <div className={`flex-1 flex flex-col w-full mx-auto shadow-lg rounded-lg p-6  bg-white`}>
                <h2 className={`text-xl font-semibold mb-4 text-center ${COLORS.RAKUTEN_RED}`}>
                    {currentTopic || "Chatbot"}
                </h2>
                <div className={`flex-1 md:bg-opacity-50 overflow-y-auto p-4 border rounded-lg ${COLORS.BORDER_LIGHT} ${COLORS.INPUT_LIGHT}`} style={backgroundStyle}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`mb-2 rounded-lg ${msg.sender === "bot" ? "text-left" : "text-right"}`}>
                            <div className={`inline-block px-4 py-2 border rounded-lg ${msg.sender === "bot" ? COLORS.BOT_LIGHT + " text-white" : COLORS.USER_LIGHT + " border-2 border-red-500"}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Render Product Cards */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {products.map((product, index) => (
                            <ProductCard key={index} product={product} />
                        ))}
                    </div>

                    <div ref={messageEndRef} /> {/* For auto-scrolling */}
                </div>
                {isChatActive ? (
                    <div className="flex items-center mt-4">
                        <input 
                            type="text" 
                            className={`flex-grow px-4 py-2 border rounded-lg placeholder-gray-400 focus:outline-none ${COLORS.INPUT_LIGHT} ${COLORS.RAKUTEN_RED}`} 
                            placeholder="Type your message..." 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            className={`ml-2 px-4 py-2 rounded-lg ${COLORS.BUTTON_LIGHT}`}
                            onClick={handleSend}
                        >
                            Send
                        </button>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 mt-4">
                        The chat has ended. Thank you for chatting with us!
                    </div>
                )}
            </div>
        </div>
    );
}
