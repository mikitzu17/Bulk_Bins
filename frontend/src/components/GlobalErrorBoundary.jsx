import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white p-10 flex flex-col items-center justify-center font-mono">
                    <h1 className="text-3xl text-red-500 mb-4 font-bold">Something went wrong.</h1>
                    <div className="bg-slate-900 p-6 rounded-xl border border-red-500/30 max-w-4xl w-full overflow-auto">
                        <h2 className="text-xl text-red-400 mb-2">{this.state.error?.toString()}</h2>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.href = '/select-business'}
                        className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold"
                    >
                        Return to Safe Zone
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
