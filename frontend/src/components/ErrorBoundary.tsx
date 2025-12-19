import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-8">
          <div className="text-center space-y-4 max-w-2xl">
            <h1 className="text-4xl font-bold text-red-500">
              Something went wrong
            </h1>
            <p className="text-gray-300">
              The application encountered an error and needs to reload.
            </p>
            {this.state.error && (
              <pre className="bg-gray-800 p-4 rounded text-left text-sm overflow-auto max-h-96">
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
