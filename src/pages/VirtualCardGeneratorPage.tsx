import React, { useState } from "react";
import { Button } from "../components/Button";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Toast } from "../components/Toast";
import { BankCardConfigService } from "../services/bankCardConfigService";
import { BankCardConfig, CHINA_PROVINCES } from "../types/bankCardConfig";
import { CardGenerator } from "../utils/cardGenerator";

interface GeneratedCard {
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
    cardType: string;
    isValid: boolean;
}

interface AddressForm {
    billingName: string;
    billingCountry: string;
    billingPostalCode: string;
    billingAdministrativeArea: string;
    billingLocality: string;
    billingDependentLocality: string;
    billingAddressLine1: string;
}

export const VirtualCardGeneratorPage: React.FC = () => {
    const [pattern, setPattern] = useState("559888039");
    const [generateCount, setGenerateCount] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error" | "info";
    } | null>(null);
    const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
    const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
    const [detectedPattern, setDetectedPattern] = useState<string>("");
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressForm, setAddressForm] = useState<AddressForm>({
        billingName: "",
        billingCountry: "China",
        billingPostalCode: "",
        billingAdministrativeArea: "",
        billingLocality: "",
        billingDependentLocality: "",
        billingAddressLine1: "",
    });

    const handleGenerate = () => {
        if (!pattern.trim()) {
            setToast({ message: "请输入卡号模式", type: "error" });
            return;
        }

        if (generateCount < 1 || generateCount > 100) {
            setToast({ message: "生成数量应在1-100之间", type: "error" });
            return;
        }

        setIsLoading(true);
        setGeneratedCards([]);
        setSelectedCardIndex(0);

        try {
            const generator = new CardGenerator();
            const cards = generator.generateCards(pattern.trim(), generateCount);

            // 转换为前端需要的格式
            const formattedCards: GeneratedCard[] = cards.map((card) => ({
                cardNumber: card.cardNumber,
                cardExpiry: `${card.month}/${card.year}`,
                cardCvc: card.cvv,
                cardType: detectCardType(card.cardNumber),
                isValid: CardGenerator.isValidLuhn(card.cardNumber),
            }));

            setGeneratedCards(formattedCards);
            setToast({
                message: `成功生成 ${formattedCards.length} 张虚拟卡！`,
                type: "success",
            });
        } catch (error: any) {
            console.error("生成虚拟卡失败:", error);
            setToast({
                message: `生成失败: ${error.message || error}`,
                type: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 检测卡类型
    const detectCardType = (cardNumber: string): string => {
        const firstDigit = cardNumber[0];
        const firstTwoDigits = cardNumber.slice(0, 2);

        if (firstDigit === "4") {
            return "Visa";
        } else if (["51", "52", "53", "54", "55"].includes(firstTwoDigits)) {
            return "Mastercard";
        } else if (["34", "37"].includes(firstTwoDigits)) {
            return "American Express";
        } else if (firstTwoDigits === "62") {
            return "UnionPay";
        } else if (["30", "36", "38", "39"].includes(firstTwoDigits)) {
            return "Diners Club";
        } else if (firstTwoDigits === "35") {
            return "JCB";
        } else if (firstTwoDigits === "60") {
            return "Discover";
        }
        return "Unknown";
    };

    // 监听模式变化，实时检测模式类型
    React.useEffect(() => {
        if (pattern.trim()) {
            const generator = new CardGenerator();
            setDetectedPattern(generator.detectPattern(pattern));
        } else {
            setDetectedPattern("");
        }
    }, [pattern]);

    const handleAddToConfig = async () => {
        if (generatedCards.length === 0) return;

        const currentCard = generatedCards[selectedCardIndex];
        if (!currentCard) return;

        // 先检查是否已有银行卡配置
        try {
            const existingConfig =
                await BankCardConfigService.getBankCardConfigList();

            if (
                existingConfig.cards.length === 0 ||
                !existingConfig.cards[0].billingAddressLine1 ||
                existingConfig.cards[0].billingAddressLine1 === "--"
            ) {
                // 没有有效的地址信息，需要用户输入
                setShowAddressForm(true);
                return;
            }

            // 有现有地址，直接使用第一张卡的地址信息
            await addCardWithAddress(existingConfig.cards[0]);
        } catch (error) {
            console.error("读取银行卡配置失败:", error);
            setShowAddressForm(true);
        }
    };

    const addCardWithAddress = async (
        addressInfo: BankCardConfig | AddressForm
    ) => {
        if (generatedCards.length === 0) return;

        const currentCard = generatedCards[selectedCardIndex];
        if (!currentCard) return;

        try {
            // 读取现有配置
            const existingConfig =
                await BankCardConfigService.getBankCardConfigList();

            // 创建新卡配置
            const newCard: BankCardConfig = {
                cardNumber: currentCard.cardNumber,
                cardExpiry: currentCard.cardExpiry,
                cardCvc: currentCard.cardCvc,
                billingName: addressInfo.billingName,
                billingCountry: addressInfo.billingCountry,
                billingPostalCode: addressInfo.billingPostalCode,
                billingAdministrativeArea: addressInfo.billingAdministrativeArea,
                billingLocality: addressInfo.billingLocality,
                billingDependentLocality: addressInfo.billingDependentLocality,
                billingAddressLine1: addressInfo.billingAddressLine1,
            };

            // 将新卡添加到最前面
            const updatedConfig = {
                cards: [newCard, ...existingConfig.cards],
            };

            const result = await BankCardConfigService.saveBankCardConfigList(
                updatedConfig
            );

            if (result.success) {
                setToast({
                    message: "虚拟卡已添加到配置！",
                    type: "success",
                });
                // 从列表中移除已添加的卡片
                const newCards = [...generatedCards];
                newCards.splice(selectedCardIndex, 1);
                setGeneratedCards(newCards);
                setSelectedCardIndex(0);
                setShowAddressForm(false);
            } else {
                setToast({
                    message: result.message,
                    type: "error",
                });
            }
        } catch (error) {
            console.error("添加到配置失败:", error);
            setToast({
                message: `添加失败: ${error}`,
                type: "error",
            });
        }
    };

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 验证地址表单
        if (!addressForm.billingName.trim()) {
            setToast({ message: "请输入持卡人姓名", type: "error" });
            return;
        }

        if (addressForm.billingCountry === "China") {
            if (!addressForm.billingPostalCode.trim()) {
                setToast({ message: "请输入邮政编码", type: "error" });
                return;
            }
            if (!addressForm.billingLocality.trim()) {
                setToast({ message: "请输入城市", type: "error" });
                return;
            }
            if (!addressForm.billingDependentLocality.trim()) {
                setToast({ message: "请输入区县", type: "error" });
                return;
            }
        }

        if (!addressForm.billingAddressLine1.trim()) {
            setToast({ message: "请输入详细地址", type: "error" });
            return;
        }

        await addCardWithAddress(addressForm);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="mb-6 text-lg font-medium leading-6 text-gray-900">
                        💳 生成虚拟卡
                    </h3>

                    <div className="space-y-6">
                        {/* 卡号模式输入 */}
                        <div>
                            <label
                                htmlFor="pattern"
                                className="block text-sm font-medium text-gray-700"
                            >
                                卡号模式 *
                            </label>
                            <input
                                type="text"
                                id="pattern"
                                value={pattern}
                                onChange={(e) => setPattern(e.target.value)}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="例如: 434256 或 4342xxxxxxxx 或 434256|12|25|123"
                                disabled={isLoading}
                            />
                            {detectedPattern && (
                                <p className="mt-1 text-sm text-blue-600">
                                    {detectedPattern}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                支持多种模式：BIN码(6位)、x模式(4342xxxx)、*模式、#模式、完整格式(卡号|月|年|CVV)
                            </p>
                        </div>

                        {/* 常用模式快捷选择 */}
                        <div className="p-4 rounded-lg bg-gray-50">
                            <h4 className="mb-2 text-sm font-medium text-gray-700">
                                💡 常用模式示例
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: "Visa BIN", value: "434256" },
                                    { label: "Mastercard BIN", value: "559888" },
                                    { label: "X模式", value: "4342xxxxxxxx" },
                                    { label: "完整格式", value: "434256|12|25|123" },
                                    { label: "智能随机", value: "434256|mm|yy|cvv" },
                                    { label: "UnionPay", value: "622200" },
                                ].map((example) => (
                                    <button
                                        key={example.value}
                                        onClick={() => setPattern(example.value)}
                                        disabled={isLoading}
                                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        {example.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 生成数量 */}
                        <div>
                            <label
                                htmlFor="generateCount"
                                className="block text-sm font-medium text-gray-700"
                            >
                                生成数量
                            </label>
                            <input
                                type="number"
                                id="generateCount"
                                value={generateCount}
                                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                                min="1"
                                max="100"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                disabled={isLoading}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                可生成1-100张虚拟卡
                            </p>
                        </div>

                        {/* 生成按钮 */}
                        <div>
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading || !pattern.trim()}
                                className="flex items-center"
                            >
                                {isLoading ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        生成中...
                                    </>
                                ) : (
                                    "🎲 生成虚拟卡"
                                )}
                            </Button>
                        </div>

                        {/* 显示生成的卡片列表 */}
                        {generatedCards.length > 0 && (
                            <div className="mt-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-base font-medium text-gray-900">
                                        ✅ 成功生成 {generatedCards.length} 张虚拟卡
                                    </h4>
                                    <span className="text-sm text-gray-600">
                                        点击卡片查看详情
                                    </span>
                                </div>

                                {/* 卡片列表 */}
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {generatedCards.map((card, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedCardIndex(index)}
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedCardIndex === index
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-xs font-medium text-gray-500">
                                                    卡片 #{index + 1}
                                                </span>
                                                <span
                                                    className={`text-xs font-medium ${card.isValid ? "text-green-600" : "text-red-600"
                                                        }`}
                                                >
                                                    {card.isValid ? "✅" : "❌"}
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                <div className="font-mono text-gray-900 break-all">
                                                    {CardGenerator.formatCardNumber(card.cardNumber)}
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-600">
                                                    <span>有效期: {card.cardExpiry}</span>
                                                    <span>CVV: {card.cardCvc}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {card.cardType}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 当前选中卡片的详细信息 */}
                                {generatedCards[selectedCardIndex] && (
                                    <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                                        <h5 className="mb-3 text-sm font-medium text-green-800">
                                            📋 卡片 #{selectedCardIndex + 1} 详细信息
                                        </h5>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-700">卡号:</span>
                                                <span className="font-mono text-gray-900">
                                                    {generatedCards[selectedCardIndex].cardNumber}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-700">
                                                    有效期:
                                                </span>
                                                <span className="font-mono text-gray-900">
                                                    {generatedCards[selectedCardIndex].cardExpiry}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-700">
                                                    CVC码:
                                                </span>
                                                <span className="font-mono text-gray-900">
                                                    {generatedCards[selectedCardIndex].cardCvc}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-700">
                                                    卡类型:
                                                </span>
                                                <span className="text-gray-900">
                                                    {generatedCards[selectedCardIndex].cardType}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-700">状态:</span>
                                                <span
                                                    className={
                                                        generatedCards[selectedCardIndex].isValid
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                    }
                                                >
                                                    {generatedCards[selectedCardIndex].isValid
                                                        ? "有效 (通过Luhn校验)"
                                                        : "无效"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-700">
                                                    完整格式:
                                                </span>
                                                <span className="font-mono text-xs text-gray-900">
                                                    {generatedCards[selectedCardIndex].cardNumber}|
                                                    {generatedCards[selectedCardIndex].cardExpiry.replace(
                                                        "/",
                                                        "|"
                                                    )}
                                                    |{generatedCards[selectedCardIndex].cardCvc}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                onClick={handleAddToConfig}
                                                variant="primary"
                                                className="flex-1"
                                            >
                                                📌 添加到银行卡配置
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    const card = generatedCards[selectedCardIndex];
                                                    const text = `${card.cardNumber}|${card.cardExpiry.replace(
                                                        "/",
                                                        "|"
                                                    )}|${card.cardCvc}`;
                                                    navigator.clipboard.writeText(text);
                                                    setToast({
                                                        message: "已复制到剪贴板！",
                                                        type: "success",
                                                    });
                                                }}
                                                variant="secondary"
                                                className="flex-1"
                                            >
                                                📋 复制
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 地址信息表单（当需要输入地址时显示） */}
                        {showAddressForm && generatedCards.length > 0 && (
                            <div className="p-4 mt-6 border border-blue-200 rounded-md bg-blue-50">
                                <h4 className="mb-4 text-sm font-medium text-blue-800">
                                    📍 请填写账单地址信息
                                </h4>
                                <form onSubmit={handleAddressSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label
                                                htmlFor="billingName"
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                持卡人姓名 *
                                            </label>
                                            <input
                                                type="text"
                                                id="billingName"
                                                value={addressForm.billingName}
                                                onChange={(e) =>
                                                    setAddressForm({
                                                        ...addressForm,
                                                        billingName: e.target.value,
                                                    })
                                                }
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="例如: Zhang San"
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="billingCountry"
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                国家/地区
                                            </label>
                                            <select
                                                id="billingCountry"
                                                value={addressForm.billingCountry}
                                                onChange={(e) =>
                                                    setAddressForm({
                                                        ...addressForm,
                                                        billingCountry: e.target.value,
                                                    })
                                                }
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            >
                                                <option value="China">中国</option>
                                                <option value="United States">美国</option>
                                                <option value="United Kingdom">英国</option>
                                            </select>
                                        </div>

                                        {addressForm.billingCountry === "China" && (
                                            <>
                                                <div>
                                                    <label
                                                        htmlFor="billingPostalCode"
                                                        className="block text-sm font-medium text-gray-700"
                                                    >
                                                        邮政编码 *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="billingPostalCode"
                                                        value={addressForm.billingPostalCode}
                                                        onChange={(e) =>
                                                            setAddressForm({
                                                                ...addressForm,
                                                                billingPostalCode: e.target.value,
                                                            })
                                                        }
                                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        placeholder="例如: 100000"
                                                    />
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <label
                                                        htmlFor="billingAdministrativeArea"
                                                        className="block text-sm font-medium text-gray-700"
                                                    >
                                                        省份/行政区 *
                                                    </label>
                                                    <select
                                                        id="billingAdministrativeArea"
                                                        value={addressForm.billingAdministrativeArea}
                                                        onChange={(e) =>
                                                            setAddressForm({
                                                                ...addressForm,
                                                                billingAdministrativeArea: e.target.value,
                                                            })
                                                        }
                                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    >
                                                        <option value="">请选择省份</option>
                                                        {CHINA_PROVINCES.map((province) => (
                                                            <option
                                                                key={province.value}
                                                                value={province.value}
                                                            >
                                                                {province.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="billingLocality"
                                                        className="block text-sm font-medium text-gray-700"
                                                    >
                                                        城市 *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="billingLocality"
                                                        value={addressForm.billingLocality}
                                                        onChange={(e) =>
                                                            setAddressForm({
                                                                ...addressForm,
                                                                billingLocality: e.target.value,
                                                            })
                                                        }
                                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        placeholder="例如: 北京市"
                                                    />
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="billingDependentLocality"
                                                        className="block text-sm font-medium text-gray-700"
                                                    >
                                                        区县 *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="billingDependentLocality"
                                                        value={addressForm.billingDependentLocality}
                                                        onChange={(e) =>
                                                            setAddressForm({
                                                                ...addressForm,
                                                                billingDependentLocality: e.target.value,
                                                            })
                                                        }
                                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        placeholder="例如: 朝阳区"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="sm:col-span-2">
                                            <label
                                                htmlFor="billingAddressLine1"
                                                className="block text-sm font-medium text-gray-700"
                                            >
                                                详细地址 *
                                            </label>
                                            <input
                                                type="text"
                                                id="billingAddressLine1"
                                                value={addressForm.billingAddressLine1}
                                                onChange={(e) =>
                                                    setAddressForm({
                                                        ...addressForm,
                                                        billingAddressLine1: e.target.value,
                                                    })
                                                }
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="例如: XX街道XX号"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex pt-4 space-x-3">
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            ✅ 确认添加
                                        </button>
                                        <button
                                            type="button"
                                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={() => setShowAddressForm(false)}
                                        >
                                            取消
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast 通知 */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};
